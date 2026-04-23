import { extractValorFromFaixa, isFaixaValorValue } from './scanUtils';

/**
 * Alguns salvamentos usam só a chave `editais`; o Admin e o resumo por edital leem `projetos`.
 * A Home já faz `projetos || editais` — esta função alinha o objeto persistido/carregado.
 */
export function normalizeProjetosOnParsed<T extends Record<string, unknown>>(data: T): T {
  const pr = data.projetos as unknown[] | undefined;
  const ed = data.editais as unknown[] | undefined;
  if ((!pr || pr.length === 0) && ed && ed.length > 0) {
    return { ...data, projetos: ed } as T;
  }
  return data;
}

/** Prioriza o payload mais completo / mais recente (evita planilha nova no browser ser apagada por cache velho no servidor). */
export function cadastroPayloadRichnessScore(d: unknown): number {
  const x = normalizeProjetosOnParsed((d as Record<string, unknown>) || {}) as Record<string, unknown>;
  const p = Array.isArray(x.projetos) ? x.projetos.length : 0;
  const ag = Array.isArray(x.agentes) ? x.agentes.length : 0;
  const gr = Array.isArray(x.grupos) ? x.grupos.length : 0;
  const es = Array.isArray(x.espacos) ? x.espacos.length : 0;
  const t = Date.parse(String(x._cadastroSavedAt || '')) || 0;
  return p * 10_000_000 + (ag + gr + es) * 10_000 + t;
}

/** Escolhe entre resposta do servidor e cópia local — desempate por `_cadastroSavedAt` (favorece o mais novo). */
export function pickRicherCadastroPayload(server: unknown, local: unknown): Record<string, unknown> {
  const a = normalizeProjetosOnParsed((server as Record<string, unknown>) || {}) as Record<string, unknown>;
  const b = normalizeProjetosOnParsed((local as Record<string, unknown>) || {}) as Record<string, unknown>;
  const sa = cadastroPayloadRichnessScore(a);
  const sb = cadastroPayloadRichnessScore(b);
  if (sb > sa) return { ...b };
  if (sa > sb) return { ...a };
  const ta = Date.parse(String(a._cadastroSavedAt || '')) || 0;
  const tb = Date.parse(String(b._cadastroSavedAt || '')) || 0;
  return tb >= ta ? { ...b } : { ...a };
}

/** Mesmo formato usado em AdminPage (`editalResumoOverrides`). */
export type EditalResumoOverride = {
  nomeBase?: string;
  ano?: number;
  total?: number;
  contemplados?: number;
  suplentes?: number;
  naoContemplados?: number;
  valor?: number;
  valorContemplados?: number;
  aproveitamentoPct?: number;
};

/**
 * Interpreta células monetárias (BRL). Só usa `extractValorFromFaixa` quando o texto é
 * claramente faixa monetária ou contém "R$" — evita capturar "Faixa 1" dentro de textos longos.
 */
export function parseBRLField(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return val;
  const raw = String(val).trim();
  if (!raw) return 0;
  const low = raw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (isFaixaValorValue(raw) || /\br\$/i.test(low)) {
    const fromFaixaText = extractValorFromFaixa(raw);
    if (fromFaixaText > 0) return fromFaixaText;
  }
  let s = raw.replace(/[^0-9.,]/g, '').trim();
  if (!s) return 0;
  if (s.includes('.') && s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (s.includes(',') && !s.includes('.')) {
    s = s.replace(',', '.');
  } else if (s.includes('.') && !s.includes(',')) {
    const parts = s.split('.');
    if (parts.length === 2 && parts[1].length === 3 && parseInt(parts[0], 10) > 0) {
      s = s.replace('.', '');
    }
    if (parts.length > 2) {
      s = parts.join('');
    }
  }
  return parseFloat(s) || 0;
}

/** Prêmio fixo por projeto contemplado no PNAB Ilhabela 2024 (a planilha costuma trazer protocolo/ID na coluna de valor). */
const VALOR_PREMIO_FIXO_PNAB_2024 = 20_000;

function normalizeEditalNomeParaMatch(p: any): string {
  return String((p as any)._editalOrigem || (p as any).edital || (p as any).Edital || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/** Edital PNAB + ano (ex.: PNAB 2024), pelo nome importado no Admin. */
export function isProjetoPnabAno(p: any, ano: number): boolean {
  const nome = normalizeEditalNomeParaMatch(p);
  if (!nome.includes('pnab')) return false;
  const y = Number((p as any)._anoOrigem ?? (p as any).ano ?? (p as any).Ano ?? 0);
  return y === ano;
}

/**
 * Valor único por projeto para estatísticas / ranking.
 * Não usa mais `Math.max` cego entre fontes: quando há divergência forte (>3×), assume
 * que uma fonte está contaminada e usa o menor valor positivo entre as fontes confiáveis.
 */
export const getProjetoValorNormalizado = (p: any): number => {
  // PNAB 2024 (Ilhabela): valor oficial fixo por contemplado — evita ranking com protocolo/CPF como "R$".
  if (isProjetoPnabAno(p, 2024) && isProjetoContemplado(p)) {
    return VALOR_PREMIO_FIXO_PNAB_2024;
  }

  const fromRaw = p._valorRaw ? parseBRLField(p._valorRaw) : 0;
  const fromField = parseBRLField(p.valor || p.Valor || p.value || p['Valor (R$)'] || 0);
  const faixaTxt = String(p.faixaValor || p.faixa || '').trim();
  const fromFaixa =
    faixaTxt && isFaixaValorValue(faixaTxt) ? extractValorFromFaixa(faixaTxt) : 0;
  const vals = [fromRaw, fromField, fromFaixa].filter((v) => v > 0 && Number.isFinite(v));
  if (vals.length === 0) return 0;
  if (vals.length === 1) return vals[0];
  const minV = Math.min(...vals);
  const maxV = Math.max(...vals);
  if (maxV > minV * 3) return minV;
  return maxV;
};

/**
 * Contemplado / aprovado: status textual (várias colunas) ou flag booleana do Admin/importação.
 */
export function isProjetoContemplado(p: any): boolean {
  if (!p || typeof p !== 'object') return false;
  const eh = (p as any).eh_contemplado;
  if (eh === false || eh === 'false' || eh === 'nao' || eh === 'não' || eh === 'Não' || eh === 'NAO') return false;
  if (eh === true || eh === 'true' || eh === 'sim' || eh === 'Sim' || eh === 'SIM' || eh === 1 || eh === '1') return true;

  const st = String(
    (p as any).status ||
      (p as any).Status ||
      (p as any).situacao ||
      (p as any).Situacao ||
      (p as any).resultado ||
      (p as any).Resultado ||
      (p as any)['Situação'] ||
      (p as any)['Situacao'] ||
      (p as any)['Situação da proposta'] ||
      (p as any)['Situacao da proposta'] ||
      ''
  )
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (!st.trim()) return false;
  if (st.includes('suplente')) return false;
  if (
    st.includes('nao contempl') ||
    st.includes('nao-contempl') ||
    st.includes('nao classific') ||
    st.includes('não contempl') ||
    st.includes('desclass') ||
    st.includes('indefer') ||
    st.includes('reprov') ||
    st.includes('nao selecion') ||
    st.includes('nao aprov') ||
    st.includes('nao defer') ||
    st.includes('nao homolog')
  ) {
    return false;
  }
  // Planilhas PNAB / prefeitura: coluna Resultado só com "Sim" ou equivalente
  if (/\b(sim|yes|ok)\b/.test(st) && !st.includes('nao ') && !st.includes('não ')) return true;
  if (/\b(deferido|deferida|deferidos|deferidas)\b/.test(st)) return true;
  if (/\bhomologad/.test(st)) return true;
  if (/\bhabilitad/.test(st)) return true;
  if (/\bapto\b/.test(st) || /\baptos\b/.test(st) || /\bapta\b/.test(st) || /\baptas\b/.test(st)) return true;
  if (st.includes('classificado dentro das vagas')) return true;
  if (st.includes('resultado final homologado')) return true;
  // Fallback: algumas planilhas trazem colunas de resultado com "sim/aprovado" fora de `status`.
  const positiveResultOnStatusLikeKey = Object.entries(p as Record<string, unknown>).some(([k, v]) => {
    const kn = String(k || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    if (
      !(
        kn.includes('status') ||
        kn.includes('resultado') ||
        kn.includes('situacao') ||
        kn.includes('classific') ||
        kn.includes('selec') ||
        kn.includes('habilit') ||
        kn.includes('homolog') ||
        kn.includes('defer')
      )
    ) {
      return false;
    }
    const vs = String(v ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
    if (!vs) return false;
    if (vs.includes('nao') || vs.includes('não') || vs.includes('indefer') || vs.includes('desclass') || vs.includes('reprov')) return false;
    return (
      vs === 'sim' ||
      vs === 'ok' ||
      vs.includes('contemplad') ||
      vs.includes('aprovad') ||
      vs.includes('classificad') ||
      vs.includes('selecionad') ||
      vs.includes('habilitad') ||
      vs.includes('homologad') ||
      vs.includes('deferid')
    );
  });
  if (positiveResultOnStatusLikeKey) return true;
  if (st.includes('ganhador') || st.includes('vencedor')) return true;
  return (
    st.includes('contemplad') ||
    st.includes('aprovad') ||
    st.includes('classificad') ||
    st.includes('selecionad') ||
    st.includes('premiad') ||
    st.includes('favorecid')
  );
}

/** Nome do edital + ano (igual ao card “por edital”), para distinguir 2020 vs 2024. */
export function getEditalNomeExibicaoProjeto(p: any): string {
  const nomeBase = String((p as any)._editalOrigem || (p as any).edital || (p as any).Edital || 'Edital não informado').trim();
  const ano = Number((p as any)._anoOrigem || (p as any).ano || (p as any).Ano || 0);
  if (Number.isFinite(ano) && ano >= 1990 && ano <= 2100) return `${nomeBase} (${ano})`;
  return nomeBase;
}

const digitsOnly = (s: unknown) => String(s ?? '').replace(/\D/g, '');

/**
 * Nome já em minúsculas, sem acentos, espaços colapsados.
 * Corrige grafias equivalentes frequentes em planilhas (mesma pessoa, sobrenome digitado diferente).
 */
function applyRankingNameOrthographyFixes(normalizedAsciiLower: string): string {
  let t = normalizedAsciiLower;
  // Italiano/brasil: Colucci vs Colussi (mesmo sobrenome em fontes diferentes)
  t = t.replace(/\bcolussi\b/g, 'colucci');
  // Sobrenome comum com grafia alternada em planilhas
  t = t.replace(/\bnovazi\b/g, 'novazzi');
  return t;
}

/**
 * Remove partículas `de`/`da`/`do` só no **meio** do nome (≥3 tokens), para alinhar
 * "Novazzi de Lima" com "Novazzi Lima" sem apagar `dos`/`das` em sobrenomes como "dos Santos".
 */
function stripWeakMiddlePortugueseParticles(rankNorm: string): string {
  const parts = rankNorm.split(' ').filter(Boolean);
  if (parts.length < 3) return rankNorm;
  const weak = new Set(['de', 'da', 'do']);
  const out = parts.filter((t, i) => {
    if (!weak.has(t)) return true;
    if (i === 0 || i === parts.length - 1) return true;
    return false;
  });
  return out.join(' ').replace(/\s+/g, ' ').trim();
}

/**
 * Normaliza nome completo para agrupamento em ranking / deduplicação:
 * minúsculas, sem acento, espaços únicos, variantes ortográficas conhecidas (ex.: Colucci/Colussi).
 */
export function normalizeFullPersonNameForRanking(fullRaw: string): string {
  const base = String(fullRaw || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (base.length < 2) return '';
  const fixed = applyRankingNameOrthographyFixes(base);
  return stripWeakMiddlePortugueseParticles(fixed);
}

/** Texto bruto do nome do proponente (mesma ordem de fallback em todo o ranking). */
function getProponentNameRawForRanking(p: any): string {
  return String(
    (p as any).proponente ??
      (p as any).Proponente ??
      (p as any)['Nome do Proponente'] ??
      (p as any)['Nome do proponente'] ??
      (p as any).nome ??
      (p as any).Nome ??
      (p as any).responsavel ??
      (p as any).Responsável ??
      ''
  ).trim();
}

function isAssocCastelhanosViveAlias(nameRaw: string, row: any): boolean {
  const n = normalizeFullPersonNameForRanking(nameRaw);
  if (!n) return false;
  if (n.includes('associacao castelhanos vive')) return true;
  if (n.includes('vivian goncalves souza')) return true;
  const entidade = normalizeFullPersonNameForRanking(
    String((row as any).entidade || (row as any).Entidade || (row as any).instituicao || (row as any).Instituicao || '')
  );
  return entidade.includes('associacao castelhanos vive');
}

/** Documento(s) do proponente concatenados (para detectar máscara e dígitos). */
function getProponentDocumentRawJoined(p: any): string {
  const bits = [
    (p as any).cpf,
    (p as any).CPF,
    (p as any).cnpj,
    (p as any).CNPJ,
    (p as any).documento,
    (p as any).Documento,
    (p as any)['CPF do proponente'],
    (p as any)['CNPJ do proponente'],
  ]
    .map((x) => String(x ?? '').trim())
    .filter(Boolean);
  return bits.join(' ');
}

function isDocumentFieldMasked(raw: string): boolean {
  return /[*•]|xxx|\*{2,}|\*{3}/i.test(raw);
}

/**
 * Chave única para ranking de contemplados.
 * Com **nome completo** (≥2 palavras e tamanho mínimo), agrupa sempre por **nome normalizado**:
 * evita a mesma pessoa ser contada em separado quando um edital tem CPF e outro não (ou CPF mascarado).
 * Sem nome completo confiável, usa CPF/CNPJ limpo (11 ou 14 dígitos) quando não estiver mascarado.
 */
export function getRankingProponentKey(p: any): string {
  const displayRaw = getProponentNameRawForRanking(p);
  if (isAssocCastelhanosViveAlias(displayRaw, p)) {
    return 'alias:associacao-castelhanos-vive';
  }
  const displayNorm = normalizeFullPersonNameForRanking(displayRaw);
  const parts = displayNorm.split(' ').filter(Boolean);
  const hasFullName = parts.length >= 2 && displayNorm.length >= 8;

  const docRaw = getProponentDocumentRawJoined(p);
  const docMasked = isDocumentFieldMasked(docRaw);
  const doc = digitsOnly(docRaw);
  const docOk = !docMasked && (doc.length === 11 || doc.length === 14);

  if (hasFullName) {
    if (displayNorm.length < 2) return '';
    return `nome:${displayNorm}`;
  }
  if (docOk) return `doc:${doc}`;
  if (displayNorm.length >= 2) return `nome:${displayNorm}`;
  return '';
}

/** Rótulo amigável na tabela (mantém capitalização do cadastro quando possível). */
export function getRankingProponentDisplayName(p: any): string {
  const s = getProponentNameRawForRanking(p);
  if (isAssocCastelhanosViveAlias(s, p)) {
    return 'Associação Castelhanos Vive (representada por Vivian Gonçalves Souza)';
  }
  return s || 'Proponente não informado';
}

export const getEditalAnoChaveProjeto = (p: any): string => {
  const edital = String(p._editalOrigem || p.edital || p.Edital || 'Sem edital');
  const ano = Number(p._anoOrigem || p.ano || p.Ano || 0);
  return `${edital}||${ano}`;
};

export type DemandaOfertaEditalRow = {
  chave: string;
  nome: string;
  nomeBase: string;
  ano: number;
  inscritos: number;
  contemplados: number;
  valorInvestido: number;
};

/**
 * Mesma lógica do resumo por edital+ano do Admin (planilha + `editalResumoOverrides`).
 */
export function computeDemandaOfertaPorEdital(
  projetos: any[] | undefined,
  overrides: Record<string, EditalResumoOverride> | undefined
): DemandaOfertaEditalRow[] {
  if (!projetos || projetos.length === 0) return [];

  const editaisMap = new Map<string, any[]>();
  projetos.forEach(p => {
    const chave = getEditalAnoChaveProjeto(p);
    if (!editaisMap.has(chave)) editaisMap.set(chave, []);
    editaisMap.get(chave)!.push(p);
  });

  const porEditalRaw = Array.from(editaisMap.entries()).map(([chave, projs]) => {
    const contProjs = projs.filter(isProjetoContemplado);
    const [nomeBase, anoStr] = chave.split('||');
    const ano = Number(anoStr || 0);
    const nome = ano > 0 ? `${nomeBase} (${ano})` : nomeBase;
    const valorInvestido = contProjs.reduce((acc, p) => acc + getProjetoValorNormalizado(p), 0);
    return {
      chave,
      nomeBase,
      nome,
      ano,
      inscritos: projs.length,
      contemplados: contProjs.length,
      valorInvestido,
    };
  });

  const ov = overrides || {};
  const merged = porEditalRaw.map(row => {
    const o = ov[row.chave];
    if (!o) return row;
    const nomeBase = o.nomeBase != null && String(o.nomeBase).trim() !== '' ? String(o.nomeBase).trim() : row.nomeBase;
    const ano = o.ano != null && Number.isFinite(o.ano) ? Number(o.ano) : row.ano;
    const nome = ano > 0 ? `${nomeBase} (${ano})` : nomeBase;
    const inscritos = o.total != null && Number.isFinite(o.total) ? Math.max(0, Math.floor(o.total)) : row.inscritos;
    const contemplados =
      o.contemplados != null && Number.isFinite(o.contemplados) ? Math.max(0, Math.floor(o.contemplados)) : row.contemplados;
    const valorInvestido =
      o.valorContemplados != null && Number.isFinite(o.valorContemplados) ? o.valorContemplados : row.valorInvestido;
    return {
      chave: row.chave,
      nomeBase,
      nome,
      ano,
      inscritos,
      contemplados,
      valorInvestido,
    };
  });

  return merged.sort((a, b) => (b.ano || 0) - (a.ano || 0));
}
