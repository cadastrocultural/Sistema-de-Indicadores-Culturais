/**
 * Cruzamento de participações na MESMA chamada (pasta do edital):
 * detecta quem foi contemplado(a) como PROPONENTE em pelo menos um projeto
 * e também aparece como INTEGRANTE DA FICHA TÉCNICA / EQUIPE em OUTRO projeto contemplado.
 *
 * Reutiliza as mesmas regras do Admin (`buildLinhasParticipacaoProjeto`): colunas de ficha técnica,
 * normalização de nomes e flag de contemplação.
 *
 * Uso:
 *   npm run cruzamento:ficha-tecnica
 *   npm run cruzamento:ficha-tecnica -- --root "src/app/data/projetos por edital"
 *
 * Formatos lidos (recursivo sob cada pasta de 1º nível após --root): .xlsx, .xls, .csv, .json
 * - JSON: array de objetos OU { "projetos": [...] }
 * PDF e outros são ignorados (aparecem no resumo como "arquivos ignorados").
 *
 * Saída: tmp/cruzamento-ficha-tecnica/relatorio.json e relatorio.csv
 */

import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import {
  buildLinhasParticipacaoProjeto,
  normalizeFullPersonNameForRanking,
  type LinhaParticipacaoProjeto,
} from '../src/app/pages/admin/projetosDemandaOferta.ts';

const DEFAULT_ROOT = path.join('src', 'app', 'data', 'projetos por edital');
const OUT_DIR = path.join('tmp', 'cruzamento-ficha-tecnica');

const SPREADSHEET_EXT = new Set(['.xlsx', '.xls', '.csv']);
const JSON_EXT = new Set(['.json']);

function parseArgs(): { root: string; todosProjetos: boolean } {
  const argv = process.argv.slice(2);
  let root = DEFAULT_ROOT;
  let todosProjetos = false;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--root' && argv[i + 1]) {
      root = argv[++i];
    }
    if (argv[i] === '--incluir-nao-contemplados') {
      todosProjetos = true;
    }
  }
  return { root: path.resolve(root), todosProjetos };
}

function inferAnoFromLabel(label: string): string {
  const m = String(label).match(/(19|20)\d{2}/);
  return m ? m[0] : '';
}

/** 1º segmento do caminho relativo = "pasta do edital" */
function editalFolderFromRelative(relFile: string): string {
  const seg = relFile.split(path.sep).filter(Boolean);
  return seg[0] || 'sem-pasta';
}

function* walkFiles(dir: string): Generator<string> {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) yield* walkFiles(full);
    else yield full;
  }
}

function loadRowsFromFile(filePath: string): Record<string, unknown>[] {
  const ext = path.extname(filePath).toLowerCase();
  if (SPREADSHEET_EXT.has(ext)) {
    const wb = XLSX.readFile(filePath);
    const out: Record<string, unknown>[] = [];
    for (const sn of wb.SheetNames) {
      const sheet = wb.Sheets[sn];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
      out.push(...rows);
    }
    return out;
  }
  if (JSON_EXT.has(ext)) {
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (Array.isArray(raw)) return raw as Record<string, unknown>[];
    if (raw && typeof raw === 'object' && Array.isArray((raw as any).projetos)) {
      return (raw as any).projetos as Record<string, unknown>[];
    }
    if (raw && typeof raw === 'object') return [raw as Record<string, unknown>];
  }
  return [];
}

export type CruzamentoHit = {
  editalPasta: string;
  chaveEdital: string;
  pessoa: string;
  pessoaNorm: string;
  comoProponente: Array<{ nomeProjeto: string; projetoInstanceKey: string; valor: number }>;
  comoFichaTecnica: Array<{
    nomeProjeto: string;
    projetoInstanceKey: string;
    funcao: string;
    valor: number;
  }>;
};

function analyze(
  linhas: LinhaParticipacaoProjeto[],
  somenteContemplados: boolean,
): CruzamentoHit[] {
  const filtradas = somenteContemplados ? linhas.filter((l) => l.eh_contemplado) : linhas;
  const byPersonEdital = new Map<string, LinhaParticipacaoProjeto[]>();
  for (const l of filtradas) {
    const nk = normalizeFullPersonNameForRanking(l.nomeRaw);
    if (!nk) continue;
    const key = `${l.chaveEdital}|||${nk}`;
    if (!byPersonEdital.has(key)) byPersonEdital.set(key, []);
    byPersonEdital.get(key)!.push(l);
  }

  const hits: CruzamentoHit[] = [];
  for (const [compoundKey, bucket] of byPersonEdital) {
    const [chaveEdital, pessoaNorm] = compoundKey.split('|||');
    const proponente = bucket.filter((l) => l.funcao.startsWith('Proponente'));
    const ficha = bucket.filter((l) => l.funcao.includes('Ficha técnica'));
    if (proponente.length === 0 || ficha.length === 0) continue;

    const chavesProp = new Set(proponente.map((l) => l.projetoInstanceKey));
    const fichaOutrosProjetos = ficha.filter((l) => !chavesProp.has(l.projetoInstanceKey));
    if (fichaOutrosProjetos.length === 0) continue;

    const editalPasta = bucket[0]?.edital || chaveEdital;
    hits.push({
      editalPasta,
      chaveEdital,
      pessoa: bucket[0]?.nomeRaw ?? pessoaNorm,
      pessoaNorm,
      comoProponente: proponente.map((l) => ({
        nomeProjeto: l.nomeProjeto,
        projetoInstanceKey: l.projetoInstanceKey,
        valor: l.valor,
      })),
      comoFichaTecnica: fichaOutrosProjetos.map((l) => ({
        nomeProjeto: l.nomeProjeto,
        projetoInstanceKey: l.projetoInstanceKey,
        funcao: l.funcao,
        valor: l.valor,
      })),
    });
  }
  return hits.sort((a, b) => a.pessoaNorm.localeCompare(b.pessoaNorm, 'pt-BR'));
}

function toCsv(hits: CruzamentoHit[]): string {
  const esc = (s: string) => `"${String(s).replace(/"/g, '""')}"`;
  const lines: string[] = [
    [
      'edital_pasta',
      'chave_edital',
      'pessoa',
      'projetos_como_proponente',
      'projetos_como_ficha_tecnica',
      'detalhe_ficha',
    ].join(','),
  ];
  for (const h of hits) {
    const prop = h.comoProponente.map((x) => x.nomeProjeto).join(' | ');
    const fich = h.comoFichaTecnica.map((x) => x.nomeProjeto).join(' | ');
    const det = h.comoFichaTecnica.map((x) => `${x.nomeProjeto} (${x.funcao})`).join(' | ');
    lines.push(
      [
        esc(h.editalPasta),
        esc(h.chaveEdital),
        esc(h.pessoa),
        esc(prop),
        esc(fich),
        esc(det),
      ].join(','),
    );
  }
  return lines.join('\n');
}

function main() {
  const { root, todosProjetos } = parseArgs();
  console.log('Raiz:', root);
  if (!fs.existsSync(root)) {
    console.error('Pasta não encontrada. Crie-a ou passe --root com o caminho dos editais.');
    process.exit(1);
  }

  let filesRead = 0;
  let rowsTotal = 0;
  let ignoredFiles = 0;
  const allLinhas: LinhaParticipacaoProjeto[] = [];

  for (const filePath of walkFiles(root)) {
    const rel = path.relative(root, filePath);
    const editalFolder = editalFolderFromRelative(rel);
    const ext = path.extname(filePath).toLowerCase();
    if (!SPREADSHEET_EXT.has(ext) && !JSON_EXT.has(ext)) {
      ignoredFiles++;
      continue;
    }
    const rows = loadRowsFromFile(filePath);
    if (rows.length === 0) {
      filesRead++;
      continue;
    }
    const ano = inferAnoFromLabel(editalFolder);
    for (const row of rows) {
      const enriched = {
        ...row,
        _editalOrigem: String((row as any)._editalOrigem || (row as any).edital || editalFolder),
        _anoOrigem: String((row as any)._anoOrigem || (row as any).ano || ano || ''),
      };
      allLinhas.push(...buildLinhasParticipacaoProjeto(enriched));
    }
    rowsTotal += rows.length;
    filesRead++;
  }

  const hits = analyze(allLinhas, !todosProjetos);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const jsonPath = path.join(OUT_DIR, 'relatorio.json');
  const csvPath = path.join(OUT_DIR, 'relatorio.csv');
  fs.writeFileSync(jsonPath, JSON.stringify({ hits, meta: { root, arquivosLidos: filesRead, linhasPlanilha: rowsTotal, ignorados: ignoredFiles, somenteContemplados: !todosProjetos } }, null, 2), 'utf8');
  fs.writeFileSync(csvPath, toCsv(hits), 'utf8');

  console.log('');
  console.log('Resumo');
  console.log('  Planilhas/JSON lidos:', filesRead);
  console.log('  Linhas de dados processadas:', rowsTotal);
  console.log('  Arquivos ignorados (pdf etc.):', ignoredFiles);
  console.log('  Participações geradas:', allLinhas.length);
  console.log('  Cruzamentos encontrados:', hits.length);
  console.log('');
  console.log('Saída:', jsonPath);
  console.log('        ', csvPath);
  if (rowsTotal === 0) {
    console.log('');
    console.log('Nenhuma linha de planilha encontrada. Coloque .xlsx/.csv/.json nas pastas do edital.');
    console.log('(Pastas só com PDF não geram cruzamento automático.)');
  }
}

main();
