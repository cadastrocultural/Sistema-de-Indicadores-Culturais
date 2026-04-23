import { COMUNIDADES_TRADICIONAIS } from './constants';

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s/_-]+/g, ' ')
    .trim();

/** Ordem decrescente de tamanho: "Guanxumas de Búzios" antes de "Guanxuma". */
const CANON_LONGEST_FIRST = [...COMUNIDADES_TRADICIONAIS].sort((a, b) => b.length - a.length);

type ComunidadeOficial = (typeof COMUNIDADES_TRADICIONAIS)[number];

/** Trechos normalizados → comunidade oficial (para bairros/planilhas sem acento/plural). */
const ALIAS_TO_CANON: Array<{ a: string; c: ComunidadeOficial }> = (
  [
    { a: 'pitangueira', c: 'Pitangueiras' },
    { a: 'vitoria', c: 'Vitória' },
    { a: 'victoria', c: 'Vitória' },
    { a: 'indaiuba', c: 'Indaiaúba' },
    { a: 'indaiauba', c: 'Indaiaúba' },
    { a: 'eustaquio', c: 'Eustáquio' },
    { a: 'buzios', c: 'Guanxumas de Búzios' },
    { a: 'guanxumas de buzios', c: 'Guanxumas de Búzios' },
    { a: 'canto do ribeirao', c: 'Canto do Ribeirão' },
    { a: 'canto da lagoa', c: 'Canto da Lagoa' },
    { a: 'porto do meio', c: 'Porto do Meio' },
    { a: 'saco do sombrio', c: 'Saco do Sombrio' },
    { a: 'sombrio', c: 'Saco do Sombrio' },
    { a: 'poco itapema', c: 'Poço/Itapema' },
    { a: 'poco / itapema', c: 'Poço/Itapema' },
  ] as Array<{ a: string; c: ComunidadeOficial }>
).sort((x, y) => y.a.length - x.a.length);

const isExplicitNo = (raw: string) => {
  const t = norm(raw);
  return t === 'nao' || t === 'n' || t === 'na' || t === '0' || t === 'false';
};

const isExplicitYesOnly = (raw: string) => {
  const t = norm(raw);
  return t === 'sim' || t === 's' || t === 'yes' || t === 'true' || t === '1';
};

/**
 * Procura o nome canônico de uma das 18 comunidades em um texto agregado
 * (bairro, endereço, campo livre, etc.).
 */
export function findComunidadeTradicionalInText(...parts: Array<string | undefined | null>): string {
  const hay = norm(parts.filter(Boolean).join(' | '));
  if (!hay) return '';

  for (const c of CANON_LONGEST_FIRST) {
    const cn = norm(c);
    if (cn && hay.includes(cn)) return c;
  }
  for (const { a, c } of ALIAS_TO_CANON) {
    if (hay.includes(a)) return c;
  }
  return '';
}

/**
 * Normaliza resposta de planilha ("Bonete", " sim ", "Não") para nome oficial ou ''.
 */
export function normalizeComunidadeTradicionalRaw(raw: string): string {
  const t = String(raw || '').trim();
  if (!t || isExplicitNo(t)) return '';
  /** "Sim" sozinho não é nome de comunidade — deixa o match pelo endereço/bairro. */
  if (isExplicitYesOnly(t)) return '';

  const tn = norm(t);
  for (const c of CANON_LONGEST_FIRST) {
    if (norm(c) === tn) return c;
    if (tn.includes(norm(c))) return c;
  }
  for (const { a, c } of ALIAS_TO_CANON) {
    if (tn === a || tn.includes(a)) return c;
  }
  return '';
}

export type ResolveComunidadeOpts = {
  /** Valor da coluna de comunidade tradicional (se existir). */
  rawField: string;
  bairro: string;
  enderecoCompleto: string;
  /** Nome do projeto / proponente — ajuda quando a comunidade só aparece no título. */
  extras?: string[];
};

/**
 * Resolve nome oficial da comunidade + flag para indicadores.
 * Preenche o nome a partir do texto (bairro/endereço) quando a planilha só traz "Sim".
 */
export function resolveComunidadeTradicional(opts: ResolveComunidadeOpts): { nome: string; eh: boolean } {
  const raw = String(opts.rawField || '').trim();
  if (isExplicitNo(raw)) return { nome: '', eh: false };

  const fromText = findComunidadeTradicionalInText(
    opts.bairro,
    opts.enderecoCompleto,
    ...(opts.extras || []),
    raw
  );

  let nome = normalizeComunidadeTradicionalRaw(raw);
  if (!nome) nome = fromText;
  else if (fromText && nome !== fromText) {
    const nomeOk = COMUNIDADES_TRADICIONAIS.includes(nome as (typeof COMUNIDADES_TRADICIONAIS)[number]);
    if (!nomeOk) nome = fromText || nome;
  }

  const nomeFinal = nome || fromText || '';
  /** Só marca com comunidade quando há nome oficial (evita "Sim" vazio nos indicadores). */
  return { nome: nomeFinal, eh: Boolean(nomeFinal) };
}
