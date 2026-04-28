import {
  getProjetoValorNormalizado,
  isProjetoContempladoParaEstatistica,
} from '../pages/admin/projetosDemandaOferta';

export interface EditalStats {
  id: string;
  nome: string;
  ano: number;
  valorTotal: number;
  qtdProjetos: number;
  cor: string;
  pdfUrl?: string;
  pdfFileName?: string;
}

export interface CategoriaStats {
  nome: string;
  qtd: number;
  valor: number;
}

// 🎯 Parser robusto para valores monetários brasileiros (R$ 336.000,00 → 336000)
export const parseBRLValue = (val: any): number => {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return val;
  let s = String(val).replace(/[^0-9.,\-]/g, '').trim();
  if (!s) return 0;
  if (s.includes('.') && s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (s.includes(',') && !s.includes('.')) {
    s = s.replace(',', '.');
  } else if (s.includes('.') && !s.includes(',')) {
    const parts = s.split('.');
    if (parts.length === 2 && parts[1].length === 3 && parseInt(parts[0]) > 0) {
      s = s.replace('.', '');
    }
    if (parts.length > 2) {
      s = parts.join('');
    }
  }
  return parseFloat(s) || 0;
};

// Tenta carregar dados importados do localStorage
const loadImportedData = () => {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem('editais_imported_data');
    if (!stored) return null;
    
    const data = JSON.parse(stored);
    
    if (!data || typeof data !== 'object') {
      console.warn('Formato invalido de dados importados.');
      return null;
    }
    
    return data;
  } catch (e) {
    console.error('Erro ao carregar dados importados:', e);
    return null;
  }
};

const importedData = loadImportedData();

// 🎯 COMPUTAR EDITAIS_STATS DINAMICAMENTE a partir dos PROJETOS importados
const computeEditaisFromProjetos = (): EditalStats[] => {
  const projetos = importedData?.projetos || [];
  if (projetos.length === 0) return [];
  
  // Agrupar projetos por _editalOrigem
  const editalMap = new Map<string, any[]>();
  projetos.forEach((p: any) => {
    const edital = (p._editalOrigem || p.edital || 'Edital Importado').toString().trim();
    if (!editalMap.has(edital)) editalMap.set(edital, []);
    editalMap.get(edital)!.push(p);
  });
  
  const result: EditalStats[] = [];
  const cores = ['#E30613', '#0b57d0', '#db2777', '#059669', '#7c3aed', '#ea580c'];
  let corIdx = 0;
  
  editalMap.forEach((projs, nomeEdital) => {
    // Contar contemplados
    const contemplados = projs.filter(isProjetoContempladoParaEstatistica);
    
    // Somar valores dos contemplados
    const valorTotal = contemplados.reduce((acc: number, p: any) => {
      return acc + getProjetoValorNormalizado(p);
    }, 0);
    
    // Detectar ano do edital
    const anoMatch = nomeEdital.match(/(\d{4})/);
    const ano = anoMatch ? parseInt(anoMatch[1]) : (projs[0]?.ano || new Date().getFullYear());
    
    result.push({
      id: `imported-${nomeEdital.replace(/\s+/g, '-').toLowerCase()}`,
      nome: nomeEdital,
      ano: typeof ano === 'number' ? ano : parseInt(ano) || 2020,
      valorTotal,
      qtdProjetos: contemplados.length,
      cor: cores[corIdx % cores.length]
    });
    corIdx++;
  });
  
  // Ordenar por ano
  result.sort((a, b) => a.ano - b.ano);
  
  return result;
};

// Computar categorias dinamicamente
const computeCategoriasFromProjetos = (): CategoriaStats[] => {
  const projetos = importedData?.projetos || [];
  if (projetos.length === 0) return [];
  
  const catMap = new Map<string, { qtd: number; valor: number }>();
  projetos.forEach((p: any) => {
    const cat = (p.areaAtuacao || p.categoria || p.area || p.Categoria || 'Outros').toString().trim();
    if (!cat || cat === '-') return;
    const current = catMap.get(cat) || { qtd: 0, valor: 0 };
    current.qtd += 1;
    if (isProjetoContempladoParaEstatistica(p)) {
      current.valor += getProjetoValorNormalizado(p);
    }
    catMap.set(cat, current);
  });
  
  return Array.from(catMap.entries())
    .map(([nome, data]) => ({ nome, ...data }))
    .sort((a, b) => b.qtd - a.qtd)
    .slice(0, 10);
};

// Computar evolucao de investimento dinamicamente
const computeEvolucaoFromProjetos = () => {
  const projetos = importedData?.projetos || [];
  if (projetos.length === 0) return [];
  
  const anoMap = new Map<number, number>();
  projetos.forEach((p: any) => {
    if (!isProjetoContempladoParaEstatistica(p)) return;
    
    const ano = parseInt(p.ano) || 2020;
    const valor = getProjetoValorNormalizado(p);
    anoMap.set(ano, (anoMap.get(ano) || 0) + valor);
  });
  
  return Array.from(anoMap.entries())
    .map(([ano, valor]) => ({ ano: String(ano), valor }))
    .sort((a, b) => parseInt(a.ano) - parseInt(b.ano));
};

// Exportar dados computados dinamicamente (sem fallback fake)
export const EDITAIS_STATS: EditalStats[] = computeEditaisFromProjetos();

export const CATEGORIAS_GERAL: CategoriaStats[] = computeCategoriasFromProjetos();

export const EVOLUCAO_INVESTIMENTO = computeEvolucaoFromProjetos();
