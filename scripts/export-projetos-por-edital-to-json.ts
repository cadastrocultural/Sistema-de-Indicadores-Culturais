/**
 * Exporta planilhas (.xlsx, .xls, .csv) e extrai texto de PDFs sob a pasta de editais → JSON.
 *
 * Uso:
 *   npm run export:projetos-json
 *   npm run export:projetos-json -- --root "src/app/data/projetos por edital"
 *   npm run export:projetos-json -- --limit 5        # só os primeiros N arquivos (teste)
 *
 * Saída (espelhando subpastas):
 *   tmp/projetos-json-export/<caminho-relativo>.json
 *   - Planilha: { type, sourceRelPath, editalPasta, sheets: { NomeDaAba: [ {...}, ... ] } }
 *   - PDF: { type, sourceRelPath, editalPasta, numPages, fullText, pages: [{ page, text }] }
 *
 * Também gera tmp/projetos-json-export/_index.json com resumo e erros.
 *
 * Notas:
 * - PDF escaneado (só imagem) pode sair com texto vazio; aí só OCR resolve.
 * - O JSON do PDF é bruto (texto concatenado); para cruzamento estruturado o ideal
 *   continua sendo planilha ou pós-processamento (ex.: regex por “Nome do Projeto”).
 */

import * as fs from 'fs';
import * as path from 'path';
import { createRequire } from 'module';
import { pathToFileURL } from 'url';
import * as XLSX from 'xlsx';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const require = createRequire(import.meta.url);
const PDF_DIST_ROOT = path.dirname(require.resolve('pdfjs-dist/package.json'));
const STANDARD_FONTS_URL = pathToFileURL(path.join(PDF_DIST_ROOT, 'standard_fonts') + path.sep).href;

const DEFAULT_ROOT = path.join('src', 'app', 'data', 'projetos por edital');
const OUT_ROOT = path.join('tmp', 'projetos-json-export');

const SPREADSHEET_EXT = new Set(['.xlsx', '.xls', '.csv']);
const PDF_EXT = new Set(['.pdf']);

type IndexEntry = {
  sourceRel: string;
  kind: 'spreadsheet' | 'pdf';
  editalPasta: string;
  outRel: string;
  ok: boolean;
  error?: string;
  numPages?: number;
  rowCount?: number;
};

function parseArgs(): { root: string; limit: number | null } {
  const argv = process.argv.slice(2);
  let root = DEFAULT_ROOT;
  let limit: number | null = null;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--root' && argv[i + 1]) root = argv[++i];
    if (argv[i] === '--limit' && argv[i + 1]) limit = Math.max(1, parseInt(argv[++i], 10) || 1);
  }
  return { root: path.resolve(root), limit };
}

function editalFolderFromRelative(relFile: string): string {
  const seg = relFile.split(path.sep).filter(Boolean);
  return seg[0] || 'sem-pasta';
}

function* walkFiles(dir: string): Generator<string> {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) yield* walkFiles(full);
    else yield full;
  }
}

function ensureDirForFile(filePath: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

async function extractPdfToPayload(absPath: string, relPath: string, editalPasta: string) {
  const data = new Uint8Array(fs.readFileSync(absPath));
  const loadingTask = getDocument({
    data,
    disableFontFace: true,
    standardFontDataUrl: STANDARD_FONTS_URL,
  });
  const doc = await loadingTask.promise;
  const pages: { page: number; text: string }[] = [];
  const parts: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const tc = await page.getTextContent();
    const text = tc.items.map((item: { str?: string }) => String(item.str ?? '')).join(' ');
    pages.push({ page: i, text });
    parts.push(text);
  }
  const fullText = parts.join('\n').trim();
  return {
    type: 'pdf' as const,
    sourceRelPath: relPath.replace(/\\/g, '/'),
    editalPasta,
    fileName: path.basename(absPath),
    numPages: doc.numPages,
    fullText,
    pages,
    extractedAt: new Date().toISOString(),
  };
}

function spreadsheetToPayload(absPath: string, relPath: string, editalPasta: string) {
  const wb = XLSX.readFile(absPath);
  const sheets: Record<string, Record<string, unknown>[]> = {};
  let rowCount = 0;
  for (const sn of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[sn], { defval: '' });
    sheets[sn] = rows;
    rowCount += rows.length;
  }
  return {
    type: 'spreadsheet' as const,
    sourceRelPath: relPath.replace(/\\/g, '/'),
    editalPasta,
    fileName: path.basename(absPath),
    sheets,
    sheetNames: wb.SheetNames,
    rowCount,
    extractedAt: new Date().toISOString(),
  };
}

function csvToPayload(absPath: string, relPath: string, editalPasta: string) {
  const raw = fs.readFileSync(absPath, 'utf8');
  const wb = XLSX.read(raw, { type: 'string' });
  const sheets: Record<string, Record<string, unknown>[]> = {};
  let rowCount = 0;
  for (const sn of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[sn], { defval: '' });
    sheets[sn] = rows;
    rowCount += rows.length;
  }
  return {
    type: 'spreadsheet' as const,
    sourceRelPath: relPath.replace(/\\/g, '/'),
    editalPasta,
    fileName: path.basename(absPath),
    sheets,
    sheetNames: wb.SheetNames,
    rowCount,
    extractedAt: new Date().toISOString(),
  };
}

async function main() {
  const { root, limit } = parseArgs();
  console.log('Origem:', root);
  console.log('Destino:', path.resolve(OUT_ROOT));
  if (limit) console.log('Limite (teste):', limit, 'arquivos');

  if (!fs.existsSync(root)) {
    console.error('Pasta de origem não existe.');
    process.exit(1);
  }

  const index: IndexEntry[] = [];
  let processed = 0;

  for (const abs of walkFiles(root)) {
    if (limit !== null && processed >= limit) break;
    const rel = path.relative(root, abs);
    const ext = path.extname(abs).toLowerCase();
    const editalPasta = editalFolderFromRelative(rel);
    const outJson = path.join(OUT_ROOT, rel + '.json');

    if (!SPREADSHEET_EXT.has(ext) && !PDF_EXT.has(ext)) continue;

    try {
      ensureDirForFile(outJson);
      if (ext === '.csv') {
        const payload = csvToPayload(abs, rel, editalPasta);
        fs.writeFileSync(outJson, JSON.stringify(payload, null, 2), 'utf8');
        index.push({
          sourceRel: rel.replace(/\\/g, '/'),
          kind: 'spreadsheet',
          editalPasta,
          outRel: path.relative(OUT_ROOT, outJson).replace(/\\/g, '/'),
          ok: true,
          rowCount: payload.rowCount,
        });
      } else if (SPREADSHEET_EXT.has(ext)) {
        const payload = spreadsheetToPayload(abs, rel, editalPasta);
        fs.writeFileSync(outJson, JSON.stringify(payload, null, 2), 'utf8');
        index.push({
          sourceRel: rel.replace(/\\/g, '/'),
          kind: 'spreadsheet',
          editalPasta,
          outRel: path.relative(OUT_ROOT, outJson).replace(/\\/g, '/'),
          ok: true,
          rowCount: payload.rowCount,
        });
      } else if (PDF_EXT.has(ext)) {
        const payload = await extractPdfToPayload(abs, rel, editalPasta);
        fs.writeFileSync(outJson, JSON.stringify(payload, null, 2), 'utf8');
        index.push({
          sourceRel: rel.replace(/\\/g, '/'),
          kind: 'pdf',
          editalPasta,
          outRel: path.relative(OUT_ROOT, outJson).replace(/\\/g, '/'),
          ok: true,
          numPages: payload.numPages,
        });
      }
      processed++;
      if (processed % 25 === 0) console.log('…', processed, 'arquivos');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      index.push({
        sourceRel: rel.replace(/\\/g, '/'),
        kind: PDF_EXT.has(ext) ? 'pdf' : 'spreadsheet',
        editalPasta,
        outRel: path.relative(process.cwd(), outJson).replace(/\\/g, '/'),
        ok: false,
        error: msg,
      });
      console.warn('Falha:', rel, msg);
      processed++;
    }
  }

  const indexPath = path.join(OUT_ROOT, '_index.json');
  ensureDirForFile(indexPath);
  fs.writeFileSync(
    indexPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        sourceRoot: root.replace(/\\/g, '/'),
        outRoot: path.resolve(OUT_ROOT).replace(/\\/g, '/'),
        totalProcessed: processed,
        ok: index.filter((x) => x.ok).length,
        failed: index.filter((x) => !x.ok).length,
        files: index,
      },
      null,
      2,
    ),
    'utf8',
  );

  console.log('');
  console.log('Concluído.');
  console.log('  Arquivos processados (alvo):', processed);
  console.log('  OK:', index.filter((x) => x.ok).length);
  console.log('  Falhas:', index.filter((x) => !x.ok).length);
  console.log('  Índice:', path.resolve(indexPath));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
