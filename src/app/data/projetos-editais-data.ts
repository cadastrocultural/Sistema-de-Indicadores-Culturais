/**
 * SISTEMA DE PROJETOS POR EDITAL
 * Armazena TODOS os projetos de TODOS os editais para análise cruzada
 */

export interface ProjetoEdital {
  id: string;
  editalId: string;
  editalNome: string;
  editalAno: number;
  nomeProponente: string;
  cpfCnpj?: string;
  nomeProjeto: string;
  categoria: string;
  valor: number;
  status: 'aprovado' | 'suplente' | 'inscrito' | 'não aprovado';
  bairro?: string;
  dataResultado?: string;
}

export interface EditalDetalhado {
  id: string;
  nome: string;
  ano: number;
  data: string;
  valorTotal: number;
  projetos: ProjetoEdital[];
}

// Carrega dados de editais com projetos do localStorage
const loadEditaisDetalhados = (): EditalDetalhado[] => {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem('editais_detalhados');
    if (!stored) {
      console.log('📋 Nenhum edital detalhado importado ainda.');
      return [];
    }
    
    const data = JSON.parse(stored);
    
    // Validação: deve ser um array
    if (!Array.isArray(data)) {
      console.warn('⚠️ Formato inválido de editais detalhados (não é array).');
      return [];
    }
    
    // Validação: cada item deve ter estrutura correta
    const valid = data.every((item: any) => 
      item && 
      typeof item === 'object' && 
      'id' in item && 
      'nome' in item && 
      Array.isArray(item.projetos)
    );
    
    if (!valid) {
      console.warn('⚠️ Formato inválido de editais detalhados (estrutura incorreta).');
      return [];
    }
    
    console.log(`✅ ${data.length} editais detalhados carregados com projetos`);
    return data;
  } catch (e) {
    console.error('❌ Erro ao ler editais detalhados:', e);
    return [];
  }
};

export const EDITAIS_DETALHADOS: EditalDetalhado[] = loadEditaisDetalhados();

// Lista TODOS os projetos de TODOS os editais em um array único
export const TODOS_PROJETOS: ProjetoEdital[] = EDITAIS_DETALHADOS.flatMap(e => e.projetos);

// ========================================
// ANÁLISES E RANKINGS
// ========================================

interface RankingProponente {
  nome: string;
  cpfCnpj?: string;
  totalAprovacoes: number;
  totalSuplencias: number;
  totalInscricoes: number;
  totalValorRecebido: number;
  editaisGanhos: string[];
  projetos: ProjetoEdital[];
  taxaSucesso: number; // percentual de aprovações
}

// Gera ranking completo de proponentes
export function gerarRankingProponentes(): RankingProponente[] {
  const map = new Map<string, RankingProponente>();
  
  TODOS_PROJETOS.forEach(projeto => {
    const key = projeto.cpfCnpj || projeto.nomeProponente;
    
    if (!map.has(key)) {
      map.set(key, {
        nome: projeto.nomeProponente,
        cpfCnpj: projeto.cpfCnpj,
        totalAprovacoes: 0,
        totalSuplencias: 0,
        totalInscricoes: 0,
        totalValorRecebido: 0,
        editaisGanhos: [],
        projetos: [],
        taxaSucesso: 0
      });
    }
    
    const ranking = map.get(key)!;
    ranking.projetos.push(projeto);
    ranking.totalInscricoes++;
    
    if (projeto.status === 'aprovado') {
      ranking.totalAprovacoes++;
      ranking.totalValorRecebido += projeto.valor;
      if (!ranking.editaisGanhos.includes(projeto.editalNome)) {
        ranking.editaisGanhos.push(projeto.editalNome);
      }
    } else if (projeto.status === 'suplente') {
      ranking.totalSuplencias++;
    }
  });
  
  // Calcula taxa de sucesso
  map.forEach(ranking => {
    ranking.taxaSucesso = ranking.totalInscricoes > 0 
      ? (ranking.totalAprovacoes / ranking.totalInscricoes) * 100 
      : 0;
  });
  
  return Array.from(map.values())
    .sort((a, b) => b.totalAprovacoes - a.totalAprovacoes);
}

// Lista de proponentes que NUNCA ganharam (apenas inscritos/suplentes)
export function getProponentesSemAprovacao(): RankingProponente[] {
  const todos = gerarRankingProponentes();
  return todos.filter(p => p.totalAprovacoes === 0 && p.totalInscricoes > 0)
    .sort((a, b) => b.totalInscricoes - a.totalInscricoes);
}

// Estatísticas gerais do sistema
export function getEstatisticasGerais() {
  const todos = gerarRankingProponentes();
  const aprovados = TODOS_PROJETOS.filter(p => p.status === 'aprovado');
  const suplentes = TODOS_PROJETOS.filter(p => p.status === 'suplente');
  
  return {
    totalEditais: EDITAIS_DETALHADOS.length,
    totalProponentes: todos.length,
    totalProjetos: TODOS_PROJETOS.length,
    totalAprovados: aprovados.length,
    totalSuplentes: suplentes.length,
    totalInvestido: aprovados.reduce((sum, p) => sum + p.valor, 0),
    proponentesComAprovacao: todos.filter(p => p.totalAprovacoes > 0).length,
    proponentesSemAprovacao: todos.filter(p => p.totalAprovacoes === 0).length,
    taxaAprovacaoMedia: TODOS_PROJETOS.length > 0 
      ? (aprovados.length / TODOS_PROJETOS.length) * 100 
      : 0
  };
}

// Top 10 proponentes mais premiados
export function getTop10Proponentes(): RankingProponente[] {
  return gerarRankingProponentes().slice(0, 10);
}

// Proponentes por categoria
export function getProponentesPorCategoria(categoria: string): RankingProponente[] {
  const todos = gerarRankingProponentes();
  return todos.filter(p => 
    p.projetos.some(proj => proj.categoria === categoria)
  );
}

// Evolução de participações por ano
export function getEvolucaoPorAno() {
  const anos = new Map<number, {
    ano: number;
    inscritos: number;
    aprovados: number;
    suplentes: number;
    valorTotal: number;
  }>();
  
  TODOS_PROJETOS.forEach(projeto => {
    if (!anos.has(projeto.editalAno)) {
      anos.set(projeto.editalAno, {
        ano: projeto.editalAno,
        inscritos: 0,
        aprovados: 0,
        suplentes: 0,
        valorTotal: 0
      });
    }
    
    const stats = anos.get(projeto.editalAno)!;
    stats.inscritos++;
    
    if (projeto.status === 'aprovado') {
      stats.aprovados++;
      stats.valorTotal += projeto.valor;
    } else if (projeto.status === 'suplente') {
      stats.suplentes++;
    }
  });
  
  return Array.from(anos.values()).sort((a, b) => a.ano - b.ano);
}