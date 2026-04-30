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
const MAX_PREMIO_INDIVIDUAL_SEM_MARCADOR_BRL = 200_000;
const VALOR_AGENTE_ALDIR_BLANC_2020 = 2_016.8;
const VALOR_GRUPO_ALDIR_BLANC_2020 = 3_000;
const VALOR_ESPACO_ALDIR_BLANC_2020 = 9_000;

export type AldirBlanc2020CadastroTipo = 'agentes' | 'grupos' | 'espacos';

/** Tipo Aldir 2020 inferido pela categoria (mapeamento / CSV cultura). */
export function inferAldir2020KindFromCadastroRow(row: any): AldirBlanc2020CadastroTipo {
  const c = String(row?.categoria || row?.Categoria || row?.tipo || row?.Tipo || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (c.includes('grupo') || c.includes('coletivo')) return 'grupos';
  if (c.includes('espaco') || c.includes('espaço')) return 'espacos';
  return 'agentes';
}

export const OFFICIAL_ALDIR_BLANC_2020_VALUES = {
  agentes: {
    chave: 'Edital de Premiação de Agentes Culturais||2020',
    nomeBase: 'Edital de Premiação de Agentes Culturais',
    nome: 'Edital de Premiação de Agentes Culturais (2020)',
    ano: 2020,
    contemplados: 150,
    valorInvestido: 150 * VALOR_AGENTE_ALDIR_BLANC_2020,
  },
  grupos: {
    chave: 'Edital de Grupos e Coletivos||2020',
    nomeBase: 'Edital de Grupos e Coletivos',
    nome: 'Edital de Grupos e Coletivos (2020)',
    ano: 2020,
    contemplados: 10,
    valorInvestido: 10 * VALOR_GRUPO_ALDIR_BLANC_2020,
  },
  espacos: {
    chave: 'Edital de Espaços Culturais||2020',
    nomeBase: 'Edital de Espaços Culturais',
    nome: 'Edital de Espaços Culturais (2020)',
    ano: 2020,
    contemplados: 6,
    valorInvestido: 6 * VALOR_ESPACO_ALDIR_BLANC_2020,
  },
} as const;

export function withOfficialAldirBlanc2020Context<T extends Record<string, any>>(
  row: T,
  tipo: AldirBlanc2020CadastroTipo
): T {
  const editalAtual = String(row?._editalOrigem || row?.edital_contemplado || row?.edital || row?.Edital || '').trim();
  const anoAtual = Number(row?._anoOrigem ?? row?.ano ?? row?.Ano ?? 0);
  if (editalAtual || (Number.isFinite(anoAtual) && anoAtual > 0 && anoAtual !== 2020)) return row;

  const edital =
    tipo === 'agentes'
      ? 'Edital de Premiação de Agentes Culturais (2020)'
      : tipo === 'grupos'
        ? 'Edital de Grupos e Coletivos (2020)'
        : 'Edital de Espaços Culturais (2020)';

  return {
    ...row,
    _editalOrigem: edital,
    _anoOrigem: 2020,
    ano: row?.ano ?? 2020,
  };
}

function parsePremioIndividualField(val: any): number {
  const parsed = parseBRLField(val);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;

  const raw = String(val ?? '').trim();
  if (/^\d+\s*[-–]\s*\d+$/.test(raw)) return 0;
  const hasCurrencySignal = /\br\$/i.test(raw) || /[,.]\d{2}\b/.test(raw);
  const looksLikePlainCode = /^\d{6,}$/.test(raw.replace(/\D/g, '')) && !hasCurrencySignal;

  // Planilhas locais costumam trazer protocolo/ID como 844433, 1050964 etc.
  if (parsed > MAX_PREMIO_INDIVIDUAL_SEM_MARCADOR_BRL) return 0;
  if (looksLikePlainCode && parsed > MAX_PREMIO_INDIVIDUAL_SEM_MARCADOR_BRL) return 0;
  if (typeof val === 'number' && Number.isInteger(val) && parsed > MAX_PREMIO_INDIVIDUAL_SEM_MARCADOR_BRL) return 0;

  return parsed;
}

function normalizeEditalNomeParaMatch(p: any): string {
  return [
    (p as any)._editalOrigem,
    (p as any).edital_contemplado,
    (p as any).edital,
    (p as any).Edital,
    (p as any).nomeEdital,
    (p as any).NomeEdital,
    (p as any).nome_edital,
    (p as any).editalNome,
    (p as any).EditalNome,
    (p as any).chamada,
    (p as any).Chamada,
    (p as any).programa,
    (p as any).Programa,
    (p as any).categoria,
    (p as any).Categoria,
  ]
    .filter((value) => value !== undefined && value !== null && String(value).trim() !== '')
    .join(' ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function getAnoProjetoParaMatch(p: any, nomeNormalizado: string): number {
  const match = nomeNormalizado.match(/\b(20\d{2}|19\d{2})\b/);
  if (match) return Number(match[1]);
  const explicit = Number((p as any)._anoOrigem ?? (p as any).ano ?? (p as any).Ano ?? (p as any).anoEdital ?? (p as any).AnoEdital ?? 0);
  if (Number.isFinite(explicit) && explicit >= 1990 && explicit <= 2100) return explicit;
  return 0;
}

function getOfficialAldirBlanc2020Tipo(p: any): AldirBlanc2020CadastroTipo | null {
  const nome = normalizeEditalNomeParaMatch(p);
  const ano = getAnoProjetoParaMatch(p, nome);
  const is2020Context = ano === 2020 || nome.includes('2020') || nome.includes('lei emergencial') || nome.includes('14 017') || nome.includes('14017');
  if (!is2020Context) return null;
  if (nome.includes('agentes culturais') || nome.includes('premiacao de agentes') || nome.includes('198/2020')) {
    return 'agentes';
  }
  if (nome.includes('grupos') || nome.includes('coletivos') || nome.includes('201/2020')) {
    return 'grupos';
  }
  if (nome.includes('espacos') || nome.includes('espaco cultural') || nome.includes('espaços') || nome.includes('220/2020')) {
    return 'espacos';
  }
  return null;
}

function getOfficialAldirBlanc2020UnitValue(p: any): number {
  const tipo = getOfficialAldirBlanc2020Tipo(p);
  if (tipo === 'agentes') return VALOR_AGENTE_ALDIR_BLANC_2020;
  if (tipo === 'grupos') return VALOR_GRUPO_ALDIR_BLANC_2020;
  if (tipo === 'espacos') return VALOR_ESPACO_ALDIR_BLANC_2020;
  return 0;
}

/** Edital PNAB + ano (ex.: PNAB 2024), pelo nome importado no Admin. */
export function isProjetoPnabAno(p: any, ano: number): boolean {
  const nome = normalizeEditalNomeParaMatch(p);
  const y = getAnoProjetoParaMatch(p, nome);
  const isPnabLike =
    nome.includes('pnab') ||
    (nome.includes('politica nacional') && nome.includes('aldir blanc')) ||
    (nome.includes('lei aldir blanc') && y === ano) ||
    (nome.includes('aldir blanc') && y === ano && ano >= 2024);
  return y === ano && isPnabLike;
}

/**
 * Valor único por projeto para estatísticas / ranking.
 * Não usa mais `Math.max` cego entre fontes: quando há divergência forte (>3×), assume
 * que uma fonte está contaminada e usa o menor valor positivo entre as fontes confiáveis.
 */
function valorFromFaixaColumns(p: any): number {
  const candidates = [
    p?.faixa,
    p?.faixaValor,
    p?.areaAtuacao,
    p?.area_atuacao,
    p?.['Área de Atuação'],
    p?.['Qual a linguagem artística escolhida?'],
    p?.['Qual a linguagem artistica escolhida?'],
    p?.linguagem,
    p?.Linguagem,
    p?.categoria,
    p?.Categoria,
  ];
  let best = 0;
  for (const f of candidates) {
    if (f == null || f === '') continue;
    if (!isFaixaValorValue(f)) continue;
    const x = extractValorFromFaixa(f);
    if (x > best) best = x;
  }
  return best;
}

export const getProjetoValorNormalizado = (p: any): number => {
  // PNAB 2024 (Ilhabela): valor oficial fixo por contemplado — evita ranking com protocolo/CPF como "R$".
  if (isProjetoPnabAno(p, 2024) && isProjetoContempladoParaEstatistica(p)) {
    return VALOR_PREMIO_FIXO_PNAB_2024;
  }

  const officialAldir2020Value = isProjetoContempladoParaEstatistica(p) ? getOfficialAldirBlanc2020UnitValue(p) : 0;
  if (officialAldir2020Value > 0) return officialAldir2020Value;

  const fromRaw = p._valorRaw ? parsePremioIndividualField(p._valorRaw) : 0;
  const fromField = parsePremioIndividualField(p.valor || p.Valor || p['Valor (R$)'] || 0);
  const fromFaixaCols = valorFromFaixaColumns(p);
  const vals = [fromRaw, fromField, fromFaixaCols].filter((v) => v > 0 && Number.isFinite(v));
  if (vals.length === 0) return 0;
  if (vals.length === 1) return vals[0];
  const minV = Math.min(...vals);
  const maxV = Math.max(...vals);
  if (maxV > minV * 3) return minV;
  return maxV;
};

export type RankingDadosCadastro = {
  projetos: any[];
  agentes?: any[] | null;
  grupos?: any[] | null;
  espacos?: any[] | null;
  mapeamento?: any[] | null;
};

/**
 * Percorre projetos + cadastro (Aldir 2020) contemplados para o ranking.
 * Evita duplicar o mesmo proponente+edital quando já existe linha equivalente em `projetos`.
 */
export function forEachRankingContempladoRow(
  dados: RankingDadosCadastro,
  visitor: (p: any) => void,
): void {
  const projetos = Array.isArray(dados.projetos) ? dados.projetos : [];
  const keysAldirFromProjetos = new Map<string, Set<string>>();

  for (const p of projetos) {
    if (!isProjetoContempladoParaEstatistica(p)) continue;
    const tipo = getOfficialAldirBlanc2020Tipo(p);
    const k = getRankingProponentKey(p);
    if (tipo && k) {
      const chave = OFFICIAL_ALDIR_BLANC_2020_VALUES[tipo].chave;
      if (!keysAldirFromProjetos.has(chave)) keysAldirFromProjetos.set(chave, new Set());
      keysAldirFromProjetos.get(chave)!.add(k);
    }
    visitor(p);
  }

  const seenCadastro = new Set<string>();

  const emitCadastro = (rows: any[] | null | undefined, tab: AldirBlanc2020CadastroTipo) => {
    const chaveOf = OFFICIAL_ALDIR_BLANC_2020_VALUES[tab].chave;
    const fromProj = keysAldirFromProjetos.get(chaveOf) || new Set();
    for (const row of rows || []) {
      if (!row || typeof row !== 'object') continue;
      if (!isProjetoContempladoParaEstatistica(row)) continue;
      const enriched = withOfficialAldirBlanc2020Context({ ...row }, tab);
      if (!getOfficialAldirBlanc2020Tipo(enriched)) continue;
      const k = getRankingProponentKey(enriched);
      if (!k) continue;
      if (fromProj.has(k)) continue;
      const dedupe = `${k}|${chaveOf}`;
      if (seenCadastro.has(dedupe)) continue;
      seenCadastro.add(dedupe);
      visitor(enriched);
    }
  };

  emitCadastro(dados.agentes, 'agentes');
  emitCadastro(dados.grupos, 'grupos');
  emitCadastro(dados.espacos, 'espacos');

  for (const row of dados.mapeamento || []) {
    if (!row || typeof row !== 'object') continue;
    const tab = inferAldir2020KindFromCadastroRow(row);
    emitCadastro([row], tab);
  }
}

function hasContemplationStatusSignal(p: any): boolean {
  return [
    'eh_contemplado',
    'contemplado',
    'status',
    'Status',
    'situacao',
    'Situacao',
    'resultado',
    'Resultado',
    'Situação',
    'Situacao',
    'Situação da proposta',
    'Situacao da proposta',
  ].some((key) => p && Object.prototype.hasOwnProperty.call(p, key) && String(p[key] ?? '').trim() !== '');
}

/**
 * Regra pública de contemplação para estatísticas.
 * Investimento público só soma linhas explicitamente contempladas ou habilitadas.
 * Valor/faixa/orçamento sem status não vira investimento realizado.
 */
export function isProjetoContempladoParaEstatistica(p: any): boolean {
  if (hasContemplationStatusSignal(p)) return isProjetoContemplado(p);
  // Planilhas só com colunas fora da lista fixa ainda passam por `isProjetoContemplado`
  // (varredura dinâmica / flags importadas); não bloquear contemplados por ausência de chave “clássica”.
  return isProjetoContemplado(p);
}

/**
 * Contemplado / habilitado: status textual (várias colunas) ou flag booleana do Admin/importação.
 */
export function isProjetoContemplado(p: any): boolean {
  if (!p || typeof p !== 'object') return false;

  const wpSt = String((p as any).wordpress_status ?? '')
    .toLowerCase()
    .trim();
  if (wpSt === 'publish' || wpSt === 'approved') return true;

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
  if (st.trim()) {
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
    return /\bhabilitad/.test(st) || st.includes('contemplad');
  }

  // Fallback: algumas planilhas trazem status em colunas auxiliares.
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
        kn.includes('habilit') ||
        kn.includes('contempl')
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
    return vs.includes('contemplad') || vs.includes('habilitad');
  });
  if (positiveResultOnStatusLikeKey) return true;

  const eh = (p as any).eh_contemplado;
  if (eh === false || eh === 'false' || eh === 'nao' || eh === 'não' || eh === 'Não' || eh === 'NAO') return false;
  if (eh === true || eh === 'true' || eh === 'sim' || eh === 'Sim' || eh === 'SIM' || eh === 1 || eh === '1') return true;
  return false;
}

/** Remove sufixo " (AAAA)" do nome do edital quando já vem na planilha (evita "(2023) (2023)"). */
function splitEditalNomeBaseAndAnoSuffix(rawNome: string): { base: string; suffixAno: number } {
  const t = rawNome.trim();
  const m = t.match(/^(.*?)[\s\u00A0]*\((19\d{2}|20\d{2})\)\s*$/);
  if (m) return { base: m[1].trim(), suffixAno: Number(m[2]) };
  return { base: t, suffixAno: 0 };
}

/** Nome do edital + ano (igual ao card “por edital”), para distinguir 2020 vs 2024. */
export function getEditalNomeExibicaoProjeto(p: any): string {
  const officialAldirTipo = getOfficialAldirBlanc2020Tipo(p);
  if (officialAldirTipo) return OFFICIAL_ALDIR_BLANC_2020_VALUES[officialAldirTipo].nome;

  const raw = String((p as any)._editalOrigem || (p as any).edital || (p as any).Edital || 'Edital não informado').trim();
  const { base, suffixAno } = splitEditalNomeBaseAndAnoSuffix(raw);
  const anoCampo = Number((p as any)._anoOrigem || (p as any).ano || (p as any).Ano || 0);
  const ano =
    Number.isFinite(anoCampo) && anoCampo >= 1990 && anoCampo <= 2100
      ? anoCampo
      : suffixAno >= 1990 && suffixAno <= 2100
        ? suffixAno
        : 0;
  if (ano > 0) return `${base} (${ano})`;
  return base;
}

/** Valores que são links de anexo (planilhas às vezes colocam URL na coluna de função). Não exibir como papel. */
function isLikelyUrlOrFileLink(s: string): boolean {
  const t = String(s ?? '').trim();
  if (!t) return false;
  if (/^https?:\/\//i.test(t)) return true;
  if (/^www\./i.test(t)) return true;
  if (/^ftp:\/\//i.test(t)) return true;
  if (/formfacade\.com/i.test(t)) return true;
  if (/drive\.google\.com/i.test(t)) return true;
  if (/docs\.google\.com/i.test(t)) return true;
  if (/dropbox\.com/i.test(t)) return true;
  if (/\.pdf(\?|#|$)/i.test(t)) return true;
  if (/\.docx?(\?|#|$)/i.test(t)) return true;
  return false;
}

/**
 * Função / papel / cargo no projeto, a partir de colunas comuns nas planilhas.
 * O import preserva chaves originais em `...row`, então também varremos chaves dinâmicas.
 */
export function getProjetoPapelOuFuncao(p: any): string {
  const directKeys = [
    'funcao',
    'Funcão',
    'função',
    'Função',
    'FUNÇÃO',
    'papel',
    'Papel',
    'PAPEL',
    'papel_no_projeto',
    'Papel no projeto',
    'cargo',
    'Cargo',
    'Cargo no projeto',
    'atuacao',
    'atuação',
    'Atuação',
    'tipo_participacao',
    'tipo_participação',
    'Tipo de participação',
    'Tipo de Participação',
    'modalidade_participacao',
    'vinculo',
    'Vínculo',
  ];
  for (const k of directKeys) {
    const v = p?.[k];
    const s = String(v ?? '').trim();
    if (!s || s === '-' || /^n[ãa]o\s+informado$/i.test(s)) continue;
    if (s.length > 240) continue;
    return s;
  }
  try {
    for (const k of Object.keys(p || {})) {
      const c = String(k)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      if (
        c.includes('funcao') ||
        c.includes('funçao') ||
        (c.includes('papel') && (c.includes('projeto') || c.includes('no'))) ||
        (c.includes('cargo') && c.includes('projeto')) ||
        c.includes('atuacao') ||
        c.includes('tipo de particip') ||
        c.includes('papel funcional')
      ) {
        const s = String(p[k] ?? '').trim();
        if (!s || s === '-' || /^n[ãa]o\s+informado$/i.test(s)) continue;
        if (isLikelyUrlOrFileLink(s)) continue;
        if (/^\d+$/.test(s)) continue;
        if (s.length > 240) continue;
        return s;
      }
    }
  } catch {
    /* ignore */
  }
  return '';
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

/** Texto bruto do nome do proponente / inscrito (mesma ordem de fallback em todo o ranking e participações). */
export function getProponentNameRawForRanking(p: any): string {
  return String(
    (p as any).proponente ??
      (p as any).Proponente ??
      (p as any)['Nome do Proponente'] ??
      (p as any)['Nome do proponente'] ??
      (p as any).nome ??
      (p as any).Nome ??
      (p as any).nome_completo ??
      (p as any)['Nome Completo'] ??
      (p as any).inscrito ??
      (p as any).Inscrito ??
      (p as any).nome_inscrito ??
      (p as any).nome_artistico ??
      (p as any)['Nome Artístico'] ??
      (p as any).nomeArtistico ??
      (p as any).razao_social ??
      (p as any)['Razão Social'] ??
      (p as any).responsavel ??
      (p as any).Responsável ??
      ''
  ).trim();
}

function columnKeyLooksLikeFichaTecnica(k: string): boolean {
  const c = String(k || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (c.includes('ficha') && (c.includes('tecnic') || c.includes('tecnica'))) return true;
  if (c.includes('equipe') && (c.includes('tecnic') || c.includes('tecnica') || c.includes('projeto') || c.includes('execuc'))) return true;
  if (c.includes('colaborador') && (c.includes('projeto') || c.includes('nome'))) return true;
  if (c.includes('integrante') && (c.includes('projeto') || c.includes('equipe'))) return true;
  if (c.includes('outros') && c.includes('integr')) return true;
  if (c.includes('demais') && c.includes('integr')) return true;
  if (c === 'elenco' || (c.includes('elenco') && c.includes('projeto'))) return true;
  if (c.includes('rol') && c.includes('equipe')) return true;
  return false;
}

function parseNomesPapeisFromFichaCell(raw: string): Array<{ nome: string; papel: string }> {
  const s = String(raw ?? '').trim();
  if (!s || s.length < 2) return [];
  const out: Array<{ nome: string; papel: string }> = [];
  const chunks = s
    .split(/\n|;|,|•|·|\||\t/)
    .map((x) => x.trim())
    .filter(Boolean);
  for (const chunk of chunks) {
    let nome = chunk;
    let papel = '';
    const mDash = chunk.match(/^(.{2,120}?)\s*[-–—:]\s*(.{1,80})$/);
    if (mDash) {
      nome = mDash[1].trim();
      papel = mDash[2].trim();
    }
    nome = nome.replace(/^\d+[\).\]]\s*/, '').replace(/^[-*]\s*/, '').trim();
    if (nome.length < 3 || nome.length > 120) continue;
    if (/^https?:\/\//i.test(nome)) continue;
    if (/^n[ãa]o\s+inform/i.test(nome)) continue;
    if (isLikelyUrlOrFileLink(papel)) papel = '';
    out.push({ nome, papel });
  }
  return out;
}

/**
 * Nomes (e papéis, quando houver) listados em colunas de ficha técnica / equipe na planilha.
 */
export function extractFichaTecnicaParticipantes(row: any): Array<{ nome: string; papel: string }> {
  if (!row || typeof row !== 'object') return [];
  const seen = new Set<string>();
  const acc: Array<{ nome: string; papel: string }> = [];
  for (const [k, v] of Object.entries(row as Record<string, unknown>)) {
    if (!columnKeyLooksLikeFichaTecnica(k)) continue;
    const parsed = parseNomesPapeisFromFichaCell(String(v ?? ''));
    for (const p of parsed) {
      const key = normalizeFullPersonNameForRanking(p.nome);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      acc.push(p);
    }
  }
  return acc;
}

export type LinhaParticipacaoProjeto = {
  nomeRaw: string;
  funcao: string;
  nomeProjeto: string;
  edital: string;
  anoLabel: string;
  chaveEdital: string;
  projetoInstanceKey: string;
  status: string;
  valor: number;
  eh_contemplado: boolean;
};

/**
 * Uma linha de planilha de projeto pode gerar várias participações: proponente + integrantes da ficha técnica.
 * Valor e contemplação são os do projeto (prêmio do edital); cada linha repete o mesmo valor só para exibição —
 * totais por pessoa devem deduplicar por `projetoInstanceKey`.
 */
export function buildLinhasParticipacaoProjeto(p: any): LinhaParticipacaoProjeto[] {
  const edital = String(p?._editalOrigem || p?.edital || 'Sem edital');
  const ano = String(p?._anoOrigem || p?.ano || '');
  const nomeProj = String(p?.nomeProjeto || p?.nome_projeto || p?.nome || '').trim();
  const status = String(p?.status || '');
  const contemplado = isProjetoContempladoParaEstatistica(p);
  const valor = getProjetoValorNormalizado(p);
  const chaveEdital = `${edital}||${ano}`;
  const projetoInstanceKey = `${nomeProj}||${chaveEdital}`;

  const principal = getProponentNameRawForRanking(p);
  const papelPlanilha = getProjetoPapelOuFuncao(p);
  const funcaoProp =
    !papelPlanilha || /^proponente$/i.test(papelPlanilha.trim())
      ? 'Proponente'
      : `Proponente · ${papelPlanilha}`;

  const out: LinhaParticipacaoProjeto[] = [];
  const principalNorm = normalizeFullPersonNameForRanking(principal);

  if (principal) {
    out.push({
      nomeRaw: principal,
      funcao: funcaoProp,
      nomeProjeto: nomeProj,
      edital,
      anoLabel: ano,
      chaveEdital,
      projetoInstanceKey,
      status,
      valor,
      eh_contemplado: contemplado,
    });
  }

  for (const ft of extractFichaTecnicaParticipantes(p)) {
    const nk = normalizeFullPersonNameForRanking(ft.nome);
    if (!nk) continue;
    if (principalNorm && nk === principalNorm) continue;
    const papelOk = ft.papel && !isLikelyUrlOrFileLink(ft.papel) ? ft.papel : '';
    const funcLabel = papelOk ? `Ficha técnica · ${papelOk}` : 'Ficha técnica';
    out.push({
      nomeRaw: ft.nome.trim(),
      funcao: funcLabel,
      nomeProjeto: nomeProj,
      edital,
      anoLabel: ano,
      chaveEdital,
      projetoInstanceKey,
      status,
      valor: contemplado ? valor : 0,
      eh_contemplado: contemplado,
    });
  }

  return out;
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
    (p as any).cpf_cnpj,
    (p as any)['CPF/CNPJ'],
    (p as any)['CPF do Proponente'],
    (p as any)['CNPJ do Proponente'],
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
  const officialAldirTipo = getOfficialAldirBlanc2020Tipo(p);
  if (officialAldirTipo) return OFFICIAL_ALDIR_BLANC_2020_VALUES[officialAldirTipo].chave;

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

function applyOfficialAldirBlanc2020Fallback(row: DemandaOfertaEditalRow): DemandaOfertaEditalRow {
  if (row.ano !== 2020) return row;
  const norm = `${row.nome} ${row.nomeBase} ${row.chave}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  /** Grupos/coletivos — edital 221/2020: mesmo prêmio unitário dos demais grupos Aldir (R$ 3 mil × 10). */
  if (
    (norm.includes('221/2020') || norm.includes('221-2020')) &&
    (norm.includes('grupo') || norm.includes('coletivo'))
  ) {
    const n = row.contemplados > 0 ? row.contemplados : OFFICIAL_ALDIR_BLANC_2020_VALUES.grupos.contemplados;
    return {
      ...row,
      contemplados: n,
      valorInvestido:
        row.valorInvestido > 0 ? row.valorInvestido : n * VALOR_GRUPO_ALDIR_BLANC_2020,
    };
  }

  if (
    (norm.includes('fomento') || norm.includes('projetos culturais')) &&
    norm.includes('221/2020') &&
    !norm.includes('grupo') &&
    !norm.includes('coletivo')
  ) {
    return {
      ...row,
      contemplados: row.contemplados > 0 ? row.contemplados : 10,
      valorInvestido: row.valorInvestido > 0 ? row.valorInvestido : 336_000,
    };
  }

  if (norm.includes('agentes culturais') || norm.includes('premiacao de agentes') || norm.includes('198/2020')) {
    return {
      ...row,
      contemplados: OFFICIAL_ALDIR_BLANC_2020_VALUES.agentes.contemplados,
      valorInvestido: OFFICIAL_ALDIR_BLANC_2020_VALUES.agentes.valorInvestido,
    };
  }

  if (norm.includes('grupos') || norm.includes('coletivos') || norm.includes('201/2020')) {
    return {
      ...row,
      contemplados: OFFICIAL_ALDIR_BLANC_2020_VALUES.grupos.contemplados,
      valorInvestido: OFFICIAL_ALDIR_BLANC_2020_VALUES.grupos.valorInvestido,
    };
  }

  if (norm.includes('espacos') || norm.includes('espaços') || norm.includes('220/2020')) {
    return {
      ...row,
      contemplados: OFFICIAL_ALDIR_BLANC_2020_VALUES.espacos.contemplados,
      valorInvestido: OFFICIAL_ALDIR_BLANC_2020_VALUES.espacos.valorInvestido,
    };
  }

  return row;
}

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
    const contProjs = projs.filter(isProjetoContempladoParaEstatistica);
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
    const overrideValor =
      o.valorContemplados != null && Number.isFinite(o.valorContemplados) ? Math.max(0, o.valorContemplados) : null;
    const limiteValorPorEdital = contemplados * MAX_PREMIO_INDIVIDUAL_SEM_MARCADOR_BRL;
    const valorInvestido =
      overrideValor != null && (limiteValorPorEdital <= 0 || overrideValor <= limiteValorPorEdital)
        ? overrideValor
        : row.valorInvestido;
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

  return merged.map(applyOfficialAldirBlanc2020Fallback).sort((a, b) => (b.ano || 0) - (a.ano || 0));
}
