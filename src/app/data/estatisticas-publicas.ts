import {
  getEditalNomeExibicaoProjeto,
  getProjetoValorNormalizado,
  isProjetoContempladoParaEstatistica,
  withOfficialAldirBlanc2020Context,
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

function normEmail(v: unknown): string {
  return String(v ?? '')
    .toLowerCase()
    .trim();
}

function normUrlKey(raw: unknown): string {
  let s = String(raw ?? '').trim().replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(s)) return '';
  return normKey(s);
}

/**
 * Chave canônica para deduplicação e união (planilhas, export WordPress/XML→CSV).
 * Ordem: documento → ID WordPress → URL de perfil → e-mail → nome|bairro → telefone.
 */
export function cadastroChaveDedupe(row: any): string {
  const doc = String(row?.cpf || row?.cpf_cnpj || row?.cnpj || row?.CNPJ || '').replace(/\D/g, '');
  if (doc.length >= 6) return `cpf:${doc}`;

  const wp = String(row?.wordpress_id || row?.wordpressId || row?.wp_post_id || row?.post_id || '').replace(/\D/g, '');
  if (wp.length > 0) return `wp:${wp}`;

  const urlRaw = row?.perfil_url || row?.link || row?.permalink || row?.url || '';
  const urlK = normUrlKey(urlRaw);
  if (urlK.length > 12) return `url:${urlK.slice(0, 240)}`;

  const email = normEmail(row?.email || row?.Email);
  if (email.includes('@')) return `email:${email}`;

  const nome = normKey(row?.nome || row?.Nome || row?.proponente || '');
  const bairro = normKey(row?.bairro || row?.Bairro || '');
  if (nome || bairro) return `nome:${nome}|bairro:${bairro}`;

  const tel = String(row?.telefone || row?.Telefone || '').replace(/\D/g, '');
  if (tel.length >= 10) return `tel:${tel}`;

  const end = normKey(String(row?.endereco || row?.enderecoCompleto || row?.Endereco || '').slice(0, 120));
  const cat = normKey(row?.categoria || row?.Categoria || '');
  if (end || cat) return `sym:${nome}|${bairro}|${cat}|${end}`;

  return '';
}

/** Remove duplicatas do mapeamento 2020 (mesma pessoa/entidade não conta duas vezes). */
export function dedupeMapeamentoCadastroRows(rows: any[]): any[] {
  const seen = new Set<string>();
  return (Array.isArray(rows) ? rows : []).filter((a: any) => {
    const key = cadastroChaveDedupe(a);
    if (!key) return true;
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
 * União canônica: linhas do array `mapeamento` (dedupe) + agentes/grupos/espaços que não repetem a mesma chave (CPF/CNPJ ou nome+bairro).
 * Usada na Home, no Dashboard e nos KPIs para um único número de “cadastro no território”.
 */
export function buildCadastroUnionRows(
  mapeamentoBase: any[],
  agentes: any[],
  grupos: any[],
  espacos: any[],
): Array<{ row: any; tipo: 'agente' | 'grupo' | 'espaco' }> {
  const mapRows = dedupeMapeamentoCadastroRows(mapeamentoBase);
  const used = new Set<string>();
  const out: Array<{ row: any; tipo: 'agente' | 'grupo' | 'espaco' }> = [];

  for (const row of mapRows) {
    const key = cadastroChaveDedupe(row);
    if (key) used.add(key);
    out.push({ row, tipo: tipoCadastroMapeamentoRow(row) });
  }

  const pushExtras = (rows: any[], tipo: 'agente' | 'grupo' | 'espaco') => {
    for (const r of rows) {
      const key = cadastroChaveDedupe(r);
      if (key) {
        if (used.has(key)) continue;
        used.add(key);
      }
      out.push({ row: r, tipo });
    }
  };

  pushExtras(Array.isArray(agentes) ? agentes : [], 'agente');
  pushExtras(Array.isArray(grupos) ? grupos : [], 'grupo');
  pushExtras(Array.isArray(espacos) ? espacos : [], 'espaco');
  return out;
}

export function countCadastroUnionByTipo(
  mapeamentoBase: any[],
  agentes: any[],
  grupos: any[],
  espacos: any[],
) {
  const rows = buildCadastroUnionRows(mapeamentoBase, agentes, grupos, espacos);
  let agentesN = 0;
  let gruposN = 0;
  let espacosN = 0;
  for (const { tipo } of rows) {
    if (tipo === 'grupo') gruposN += 1;
    else if (tipo === 'espaco') espacosN += 1;
    else agentesN += 1;
  }
  return { agentes: agentesN, grupos: gruposN, espacos: espacosN, total: rows.length };
}

/**
 * Transparência / home (KPIs):
 * - Cadastro no território = união deduplicada de `mapeamento` + agentes + grupos + espaços (mesma regra do mapa).
 * - Inscrições no sistema = cadastro acima + quantidade de projetos inscritos.
 */
export function computeEstatisticasPublicas(data: PayloadPublico) {
  const projetos = (data.projetos || []) as any[];
  const mapeamento = Array.isArray(data.mapeamento) ? (data.mapeamento as any[]) : [];
  const agentes = (data.agentes || []) as any[];
  const grupos = (data.grupos || []) as any[];
  const espacos = (data.espacos || []) as any[];

  const cadastroPorTipoMapeamento = countCadastroUnionByTipo(mapeamento, agentes, grupos, espacos);
  const totalMapeamento = cadastroPorTipoMapeamento.total;

  const contemImportados = projetos.filter(isProjetoContempladoParaEstatistica);
  const valorImportados = contemImportados.reduce((acc: number, p: any) => acc + getProjetoValorNormalizado(p), 0);

  const cadastrosComValor = [
    ...((data.agentes || []) as any[]).map((row) => withOfficialAldirBlanc2020Context(row, 'agentes')),
    ...((data.grupos || []) as any[]).map((row) => withOfficialAldirBlanc2020Context(row, 'grupos')),
    ...((data.espacos || []) as any[]).map((row) => withOfficialAldirBlanc2020Context(row, 'espacos')),
    ...mapeamento.map((row) => {
      const t = tipoCadastroMapeamentoRow(row);
      const tab: 'agentes' | 'grupos' | 'espacos' = t === 'grupo' ? 'grupos' : t === 'espaco' ? 'espacos' : 'agentes';
      return withOfficialAldirBlanc2020Context(row as any, tab);
    }),
  ];
  const contemMapeamento = cadastrosComValor.filter((row: any) => {
    const valor = getProjetoValorNormalizado(row);
    const flag =
      row?.eh_contemplado === true ||
      row?.eh_contemplado === 'true' ||
      row?.eh_contemplado === 'sim' ||
      row?.eh_contemplado === 'Sim' ||
      row?.contemplado === true ||
      isProjetoContempladoParaEstatistica(row);
    return flag || valor > 0;
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
