/**
 * Extração de campos de diversidade para o Painel (Dashboard), alinhada à lógica da página Início.
 */

import { scanOrientacaoInRow, scanValueInRow } from '../pages/admin/scanUtils';

/** Valores típicos de identidade de gênero (scan quando não há coluna “identidade_*”). */
const IDENTIDADE_GENERO_SCAN_OPTIONS = [
  'Mulher Transgênero',
  'Homem Transgênero',
  'Travesti',
  'Não-Binário',
  'Não Binário',
  'Gênero Fluido',
  'Agênero',
  'Bigênero',
  'Intersexo',
  'Two-Spirit',
  'Pangênero',
] as const;

export function findFieldValue(obj: any, ...patterns: string[]): string {
  if (!obj || typeof obj !== 'object') return '';
  for (const p of patterns) {
    if (obj[p] !== undefined && obj[p] !== null && obj[p] !== '') return String(obj[p]);
  }
  const keys = Object.keys(obj);
  for (const p of patterns) {
    const pNorm = p
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    const found = keys.find((k) => {
      const kNorm = k
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[;:.,]/g, '')
        .trim();
      return kNorm === pNorm || kNorm.includes(pNorm) || pNorm.includes(kNorm);
    });
    if (found && obj[found] !== undefined && obj[found] !== null && obj[found] !== '') return String(obj[found]);
  }
  return '';
}

export function normalizeLooseKey(s: string): string {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[;:.,]/g, '')
    .trim();
}

export function extractPcdColumnValue(obj: any): string {
  let best: { score: number; val: string; keyLen: number } | null = null;
  for (const k of Object.keys(obj || {})) {
    const cl = normalizeLooseKey(k);
    if (
      cl.includes('publico') ||
      cl.includes('faixa etaria') ||
      cl.includes('faixaet') ||
      (cl.includes('valor') && !cl.includes('deficienc'))
    ) {
      continue;
    }
    let score = 0;
    if (cl.includes('deficienc') || cl.includes('pessoa com deficienc')) score = 5;
    else if (/(^| )pcd( |$)/.test(cl) || cl === 'pcd') score = 4;
    else if (cl.includes('necessidades especiais')) score = 3;
    if (score === 0) continue;
    const v = obj[k];
    const s = v !== undefined && v !== null ? String(v).trim() : '';
    if (!s) continue;
    const keyLen = k.length;
    if (!best || score > best.score || (score === best.score && keyLen > best.keyLen)) {
      best = { score, val: s, keyLen };
    }
  }
  if (best) return best.val;
  const cand = [obj?.deficiencia, obj?.pcd, obj?.pessoa_com_deficiencia, obj?.['Deficiência'], obj?.['PcD']];
  const first = cand.find((v) => v !== undefined && v !== null && String(v).trim() !== '');
  return first ? String(first).trim() : '';
}

export function isPcdDeclaracaoPositiva(raw: string): boolean {
  const v = normalizeLooseKey(raw);
  if (!v || v === '-' || v === 'n/a') return false;
  const negatives = [
    'nao',
    'não',
    'nenhum',
    'nenhuma',
    'sem',
    'nao informado',
    'não informado',
    'nao possui',
    'não possui',
    'ausente',
  ];
  if (negatives.includes(v)) return false;
  if (v.startsWith('nao ') || v.startsWith('não ')) return false;
  if (v === 'sim' || v === 'yes' || v.startsWith('sim,') || v.startsWith('sim ')) return true;
  const tipos = [
    'deficienc',
    'auditiva',
    'visual',
    'cegueir',
    'surdez',
    'surdo',
    'surda',
    'fisica',
    'motora',
    'intelectual',
    'multipl',
    'autismo',
    'tea',
    'baixa visao',
    'baix visao',
  ];
  return tipos.some((t) => v.includes(t));
}

export type DiversityFieldsSlice = {
  orientacao_sexual: string;
  identidade_genero: string;
  /** Mesma linha usada em mulheres/homens na Home (pode incluir identidade no fuzzy). */
  genero: string;
  /** Só gênero/sexo declarado — usado no eixo trans/NB do LGBTQIA+ (como na Home). */
  genero_sexo: string;
  raca: string;
  idade: string;
  deficiencia: string;
  comunidadeTradicional: string;
};

function scanIdentidadeGeneroCol(a: any): string {
  const rowKeys = Object.keys(a || {});
  const col = rowKeys.find((k) => {
    const cl = k
      .replace(/[;:.,]/g, '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    return (
      (cl.includes('identidade') && cl.includes('genero')) ||
      cl.includes('identidadedegenero') ||
      cl.includes('identidade_genero')
    );
  });
  if (col && a[col]) {
    const val = String(a[col]).trim();
    if (val && val.length < 120) return val;
  }
  return scanValueInRow(a, IDENTIDADE_GENERO_SCAN_OPTIONS, [
    'raca',
    'cor',
    'etnia',
    'deficiencia',
    'pcd',
    'orientacao',
    'sexualidade',
    'idade',
    'nascimento',
    'categoria',
    'segmento',
    'area',
    'linguagem',
    'modalidade',
    'atuacao',
    'comunidade',
    'faixa',
    'valor',
    'bairro',
    'nome',
    'proponente',
  ]);
}

export function diversityFieldsFromRaw(a: any): DiversityFieldsSlice {
  const orientacaoDireta = findFieldValue(
    a,
    'orientacao_sexual',
    'Orientação Sexual',
    'Orientacao Sexual',
    'sexualidade',
    'orientacao',
    'orientacao_sex'
  );
  /** Planilhas com rótulo fora do padrão: mesmo scanner usado no Admin na importação. */
  const orientacao_sexual = orientacaoDireta.trim() || scanOrientacaoInRow(a).trim();

  const identidadeDireta = findFieldValue(
    a,
    'identidade_genero',
    'Identidade de gênero',
    'Identidade de genero',
    'Identidade Genero',
    'identidade de genero'
  );
  const identidade_genero = identidadeDireta.trim() || scanIdentidadeGeneroCol(a).trim();
  const genero = findFieldValue(a, 'genero', 'sexo', 'Gênero', 'Sexo', 'identidade_genero');
  const genero_sexo = findFieldValue(a, 'genero', 'sexo', 'Gênero', 'Sexo');
  const raca = findFieldValue(a, 'raca', 'etnia', 'autodeclaracao', 'Raça', 'Raça/Cor', 'raca_cor', 'Cor', 'cor');
  const idade = findFieldValue(a, 'idade', 'faixa_etaria', 'Idade', 'Faixa Etária', 'data_nascimento', 'nascimento');
  const comunidadeTradicional =
    findFieldValue(
      a,
      'comunidadeTradicional',
      'comunidade_tradicional',
      'Comunidade Tradicional',
      'Comunidades Tradicionais',
      'comunidade_tradicional_nome'
    ) || String(a?.comunidadeTradicional || '').trim();
  const deficiencia = extractPcdColumnValue(a);
  return {
    orientacao_sexual,
    identidade_genero,
    genero,
    genero_sexo,
    raca,
    idade,
    deficiencia,
    comunidadeTradicional,
  };
}

/** União LGBTQIA+ igual à HomePage (orientação + identidade de gênero + gênero/sexo). */
export function itemIsLgbtqia(d: Pick<DiversityFieldsSlice, 'orientacao_sexual' | 'identidade_genero' | 'genero_sexo'>): boolean {
  /** Algumas planilhas gravam orientação na coluna de gênero/sexo; incluímos esse texto na detecção de orientação (não na identidade). */
  const orientacao = (d.orientacao_sexual + ' ' + d.genero_sexo)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const idGeneroCampo = d.identidade_genero
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const generoVal = d.genero_sexo
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const isLgbtOrientacao =
    orientacao.includes('lgbt') ||
    orientacao.includes('homossexual') ||
    orientacao.includes('bissexual') ||
    orientacao.includes('pansexual') ||
    orientacao.includes('assexual') ||
    orientacao.includes('queer') ||
    orientacao.includes('lesbica') ||
    orientacao.includes('gay');
  const isLgbtIdGenero =
    idGeneroCampo.includes('trans') ||
    idGeneroCampo.includes('travesti') ||
    idGeneroCampo.includes('nao binario') ||
    idGeneroCampo.includes('não binario') ||
    idGeneroCampo.includes('nao-binario') ||
    idGeneroCampo.includes('genero fluido') ||
    idGeneroCampo.includes('agenero') ||
    idGeneroCampo.includes('intersexo') ||
    idGeneroCampo.includes('nao cisgener') ||
    idGeneroCampo.includes('não cisgener');
  const isLgbtGenero =
    generoVal.includes('travesti') ||
    generoVal.includes('transgenero') ||
    generoVal.includes('trans feminino') ||
    generoVal.includes('trans masculino') ||
    generoVal.includes('transfeminino') ||
    generoVal.includes('transmasculino') ||
    generoVal.includes('nao binario') ||
    generoVal.includes('não binario') ||
    generoVal.includes('genero fluido') ||
    generoVal.includes('agenero') ||
    generoVal.includes('intersexo') ||
    generoVal.includes('nao cisgener') ||
    (generoVal.includes('trans') && !generoVal.includes('transparencia') && !generoVal.includes('transporte'));
  return isLgbtOrientacao || isLgbtIdGenero || isLgbtGenero;
}
