import {
  getEditalNomeExibicaoProjeto,
  getProjetoValorNormalizado,
  isProjetoContemplado,
} from '../pages/admin/projetosDemandaOferta';

export type PayloadPublico = {
  agentes?: unknown[] | null;
  grupos?: unknown[] | null;
  espacos?: unknown[] | null;
  projetos?: unknown[] | null;
  /** Quando existir, o cadastro público usa só estas linhas (dedupe + tipos), sem somar agentes/grupos/espacos em paralelo. */
  mapeamento?: unknown[] | null;
};

function normKey(v: unknown): string {
  return String(v ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/** Igual à chave do painel (CPF/CNPJ ou nome+bairro). */
function cadastroChaveMapeamento(row: any): string {
  const cpf = String(row?.cpf || row?.cpf_cnpj || row?.cnpj || '').replace(/\D/g, '');
  const nome = normKey(row?.nome || row?.Nome || '');
  const bairro = normKey(row?.bairro || row?.Bairro || '');
  return cpf ? `cpf:${cpf}` : `nome:${nome}|bairro:${bairro}`;
}

/** Remove duplicatas do mapeamento 2020 (mesma pessoa/entidade não conta duas vezes). */
export function dedupeMapeamentoCadastroRows(rows: any[]): any[] {
  const seen = new Set<string>();
  return (Array.isArray(rows) ? rows : []).filter((a: any) => {
    const key = cadastroChaveMapeamento(a);
    if (!key || key === 'nome:|bairro:') return true;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function tipoCadastroMapeamentoRow(row: any): 'agente' | 'grupo' | 'espaco' {
  const c = normKey(row?.categoria || row?.Categoria || row?.tipo || row?.Tipo || '');
  if (c.includes('grupo') || c.includes('coletivo')) return 'grupo';
  if (c.includes('espaco') || c.includes('espaço')) return 'espaco';
  return 'agente';
}

export function countCadastroPorTipoMapeamento(rows: any[]) {
  const deduped = dedupeMapeamentoCadastroRows(rows);
  let agentes = 0;
  let grupos = 0;
  let espacos = 0;
  for (const r of deduped) {
    const t = tipoCadastroMapeamentoRow(r);
    if (t === 'grupo') grupos += 1;
    else if (t === 'espaco') espacos += 1;
    else agentes += 1;
  }
  return { agentes, grupos, espacos, total: deduped.length };
}

/**
 * Transparência / home (KPIs):
 * - Cadastro: somente linhas do **mapeamento 2020** quando `mapeamento` vier preenchido (dedupe, por categoria).
 * - Senão: fallback legado = soma agentes + grupos + espaços (sem cruzar com mapeamento).
 * - Inscrições no sistema = cadastro acima + quantidade de projetos inscritos.
 */
export function computeEstatisticasPublicas(data: PayloadPublico) {
  const projetos = (data.projetos || []) as any[];
  const mapeamento = Array.isArray(data.mapeamento) ? (data.mapeamento as any[]) : [];

  let totalMapeamento: number;
  let cadastroPorTipoMapeamento: { agentes: number; grupos: number; espacos: number; total: number };

  if (mapeamento.length > 0) {
    cadastroPorTipoMapeamento = countCadastroPorTipoMapeamento(mapeamento);
    totalMapeamento = cadastroPorTipoMapeamento.total;
  } else {
    const agentes = data.agentes || [];
    const grupos = data.grupos || [];
    const espacos = data.espacos || [];
    totalMapeamento = agentes.length + grupos.length + espacos.length;
    cadastroPorTipoMapeamento = {
      agentes: agentes.length,
      grupos: grupos.length,
      espacos: espacos.length,
      total: totalMapeamento,
    };
  }

  const contemImportados = projetos.filter((p) => isProjetoContemplado(p) || getProjetoValorNormalizado(p) > 0);
  const valorImportados = contemImportados.reduce((acc: number, p: any) => acc + getProjetoValorNormalizado(p), 0);

  const cadastrosComValor = [
    ...((data.agentes || []) as any[]),
    ...((data.grupos || []) as any[]),
    ...((data.espacos || []) as any[]),
    ...mapeamento,
  ];
  const contemMapeamento = cadastrosComValor.filter((row: any) => {
    const valor = getProjetoValorNormalizado(row);
    return row?.eh_contemplado === true || row?.eh_contemplado === 'true' || row?.contemplado === true || valor > 0;
  });
  const valorMapeamento = contemMapeamento.reduce((acc: number, row: any) => acc + getProjetoValorNormalizado(row), 0);

  const editaisSet = new Set<string>();
  projetos.forEach((p: any) => {
    const ed = getEditalNomeExibicaoProjeto(p).trim();
    if (ed && ed !== 'Edital não informado') editaisSet.add(ed);
  });

  return {
    totalInscritos: totalMapeamento + projetos.length,
    totalContemplados: contemImportados.length + contemMapeamento.length,
    totalValorInvestido: valorImportados + valorMapeamento,
    totalEditais: editaisSet.size,
    projetosInscritos: projetos.length,
    totalMapeamento,
    cadastroPorTipoMapeamento,
  };
}
