/**
 * Valida e limpa dados importados do Excel
 * Remove linhas vazias e registros inválidos
 */

export interface ProjetoEdital {
  editalNome: string;
  editalAno: number;
  nomeProponente: string;
  cpfCnpj: string;
  nomeProjeto: string;
  categoria: string;
  valor: number;
  status: string;
  bairro: string;
}

/**
 * Remove linhas completamente vazias ou com poucos campos preenchidos
 */
export function cleanEmptyRows(data: any[]): any[] {
  return data.filter((row: any) => {
    const values = Object.values(row);
    // Conta quantos campos têm conteúdo real
    const nonEmptyFields = values.filter((val: any) => {
      if (val === null || val === undefined) return false;
      const str = String(val).trim();
      return str !== '' && str !== 'null' && str !== 'undefined';
    }).length;
    
    // Linha é válida se tiver pelo menos 2 campos preenchidos
    return nonEmptyFields >= 2;
  });
}

/**
 * Valida e filtra projetos de editais
 * Remove projetos sem nome de proponente ou projeto
 */
export function validateProjects(projects: ProjetoEdital[]): ProjetoEdital[] {
  return projects.filter((projeto) => {
    const temNome = projeto.nomeProponente && String(projeto.nomeProponente).trim() !== '';
    const temProjeto = projeto.nomeProjeto && String(projeto.nomeProjeto).trim() !== '';
    // Pelo menos um dos dois deve estar preenchido
    return temNome || temProjeto;
  });
}

/**
 * Relatório de validação
 */
export function getValidationReport(original: number, cleaned: number): string {
  const removed = original - cleaned;
  if (removed === 0) {
    return `✅ ${cleaned} registros válidos (nenhuma linha vazia removida)`;
  }
  return `✅ ${cleaned} registros válidos de ${original} (removidos ${removed} vazios)`;
}
