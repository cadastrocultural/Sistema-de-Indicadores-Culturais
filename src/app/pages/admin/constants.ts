export { COMUNIDADES_TRADICIONAIS } from '../../data/comunidades-tradicionais';

// 🎭 Opções de Gênero/Identidade de Gênero (lista completa conforme políticas culturais brasileiras)
export const GENERO_OPTIONS = [
  'Feminino',
  'Masculino',
  'Mulher Cisgênero',
  'Homem Cisgênero',
  'Mulher Transgênero',
  'Homem Transgênero',
  'Travesti',
  'Não-Binário',
  'Gênero Fluido',
  'Agênero',
  'Bigênero',
  'Intersexo',
  'Queer',
  'Two-Spirit',
  'Pangênero',
  'Outro',
  'Prefiro não informar',
  'Não informado',
] as const;

// 🎨 Opções de Raça/Cor (IBGE + categorias culturais brasileiras)
export const RACA_OPTIONS = [
  'Branca', 'Preta', 'Parda', 'Amarela', 'Indígena',
  'Branco', 'Preto', 'Pardo', 'Amarelo', 'Indigena',
  'Negro', 'Negra', 'Quilombola', 'Afrodescendente',
  'Caiçara', 'Caicara', 'Caboclo', 'Cabocla',
  'Mestiço', 'Mestiça', 'Mestico', 'Mestica',
  'Não informado', 'Prefiro não informar', 'Não declarado', 'Não declarada',
  'Prefiro não declarar', 'Nao informado', 'Nao declarado',
] as const;

// ♿ Opções de PcD (Pessoa com Deficiência)
export const PCD_OPTIONS = [
  'Sim', 'Não', 'SIM', 'NÃO', 'Nao', 'NAO',
  'Deficiência Física', 'Deficiência Visual', 'Deficiência Auditiva',
  'Deficiência Intelectual', 'Deficiência Múltipla', 'Deficiência Mental',
  'Surdez', 'Cegueira', 'Baixa Visão', 'Mobilidade Reduzida',
  'Autismo', 'TEA', 'TDAH', 'Síndrome de Down',
  'Pessoa com deficiência', 'PcD', 'PCD',
  'Não possuo deficiência', 'Não possuo', 'Nenhuma',
  'Não sou pessoa com deficiência',
] as const;

// 🔍 Opções de Orientação Sexual
export const ORIENTACAO_OPTIONS = [
  'Heterossexual', 'Homossexual', 'Bissexual', 'Pansexual', 'Assexual',
  'Lésbica', 'Gay', 'Queer', 'Fluido', 'Demissexual',
  'Prefiro não informar', 'Não informado', 'Outro',
] as const;

// 🔗 Links oficiais dos editais (resultado e resumo para transparência)
export const LINKS_EDITAIS: Record<string, { resultado?: string; resumo?: string; diarioOficial?: string; label?: string }> = {
  'Edital de Fomento — Chamada 221/2020': {
    resultado: 'https://www.ilhabela.sp.gov.br/cultura/edital-fomento-221-2020-resultado',
    resumo: 'https://www.ilhabela.sp.gov.br/cultura/edital-fomento-221-2020-resumo',
    diarioOficial: 'https://www.ilhabela.sp.gov.br/diario-oficial',
    label: 'Chamada Pública 221/2020',
  },
  'PNAB 2024': {
    resultado: 'https://www.ilhabela.sp.gov.br/cultura/pnab-2024-resultado',
    resumo: 'https://www.ilhabela.sp.gov.br/cultura/pnab-2024-resumo',
    diarioOficial: 'https://www.ilhabela.sp.gov.br/diario-oficial',
    label: 'PNAB 2024 — Política Nacional Aldir Blanc',
  },
  'Lei Aldir Blanc 2020': {
    resultado: 'https://www.ilhabela.sp.gov.br/cultura/lei-aldir-blanc-2020-resultado',
    resumo: 'https://www.ilhabela.sp.gov.br/cultura/lei-aldir-blanc-2020-resumo',
    diarioOficial: 'https://www.ilhabela.sp.gov.br/diario-oficial',
    label: 'Lei Aldir Blanc 2020',
  },
  /** Ciclo 2023 — pasta oficial no Google Drive (prefeitura). */
  'Lei Paulo Gustavo (2023)': {
    resultado: 'https://drive.google.com/drive/folders/1bBzRdgEdtv4kUDO3ZqKlAXLQMDLaXCIT',
    resumo: 'https://drive.google.com/drive/folders/1bBzRdgEdtv4kUDO3ZqKlAXLQMDLaXCIT',
    diarioOficial: 'https://www.ilhabela.sp.gov.br/diario-oficial',
    label: 'Lei Paulo Gustavo (2023) — documentos no Drive',
  },
  'Lei Paulo Gustavo': {
    resultado: 'https://www.ilhabela.sp.gov.br/cultura/lei-paulo-gustavo-resultado',
    resumo: 'https://www.ilhabela.sp.gov.br/cultura/lei-paulo-gustavo-resumo',
    diarioOficial: 'https://www.ilhabela.sp.gov.br/diario-oficial',
    label: 'Lei Paulo Gustavo',
  },
  'PEC': {
    resultado: 'https://www.ilhabela.sp.gov.br/cultura/pec-resultado',
    resumo: 'https://www.ilhabela.sp.gov.br/cultura/pec-resumo',
    diarioOficial: 'https://www.ilhabela.sp.gov.br/diario-oficial',
    label: 'PEC — Política Estadual de Cultura',
  },
};