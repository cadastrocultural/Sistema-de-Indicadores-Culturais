/**
 * MAPEAMENTO CULTURAL DE ILHABELA 2020
 * Dados REAIS dos agentes culturais cadastrados
 * Fallback estático quando localStorage estiver vazio (produção Vercel)
 */

import { getBairroCoords } from './bairros-coords';

export interface AgenteCultural {
  id: number;
  nome: string;
  categoria: string;
  bairro: string;
  cpf_cnpj: string;
  lat: number;
  lng: number;
  eh_contemplado: boolean;
  ano: number;
  email?: string;
  telefone?: string;
  edital_contemplado?: string;
}

// Carrega APENAS dados importados do localStorage (dados reais de planilhas)
const loadMapeamentoImportado = (): AgenteCultural[] => {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem('editais_imported_data');
    if (!stored) {
      console.log('📋 Nenhum dado de mapeamento importado ainda. Use a página Admin para fazer upload.');
      return [];
    }
    
    const data = JSON.parse(stored);
    
    // Validação: verifica se existe a chave 'agentes'
    if (!data || typeof data !== 'object' || !data.agentes) {
      console.warn('⚠️ Formato inválido detectado. Limpando localStorage automaticamente...');
      localStorage.removeItem('editais_imported_data');
      return [];
    }
    
    // Validação: agentes deve ser array
    if (!Array.isArray(data.agentes)) {
      console.warn('⚠️ Formato inválido detectado (agentes não é array). Limpando localStorage...');
      localStorage.removeItem('editais_imported_data');
      return [];
    }
    
    console.log(`✅ ${data.agentes.length} agentes culturais carregados do sistema`);
    return data.agentes;
  } catch (e) {
    console.error('❌ Erro ao ler dados importados. Limpando localStorage...', e);
    localStorage.removeItem('editais_imported_data');
    return [];
  }
};

// DADOS EXPORTADOS: APENAS dados reais importados
export const MAPEAMENTO_2020: AgenteCultural[] = loadMapeamentoImportado();

// Estatísticas do Mapeamento 2020
export const STATS_MAPEAMENTO = {
  totalInscritos: MAPEAMENTO_2020.length,
  totalContemplados: MAPEAMENTO_2020.filter(a => a.eh_contemplado).length,
  porBairro: MAPEAMENTO_2020.reduce((acc, agente) => {
    acc[agente.bairro] = (acc[agente.bairro] || 0) + 1;
    return acc;
  }, {} as Record<string, number>),
  porCategoria: MAPEAMENTO_2020.reduce((acc, agente) => {
    acc[agente.categoria] = (acc[agente.categoria] || 0) + 1;
    return acc;
  }, {} as Record<string, number>)
};