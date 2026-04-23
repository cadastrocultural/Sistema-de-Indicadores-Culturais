/**
 * ARQUIVO DE DADOS OFICIAL - PNAB ILHABELA 2024
 * Dados extraídos da lista de beneficiários do Edital de Chamamento Público.
 */

import { COMUNIDADES_TRADICIONAIS } from './comunidades-tradicionais';

export interface ProjetoPNAB {
  id: number;
  ano: number;
  nome_projeto: string;
  proponente: string;
  cpf_cnpj: string;
  categoria: string;
  bairro: string;
  local_execucao: string;
  lat: number | null;
  lng: number | null;
  eh_comunidade_tradicional: boolean;
  comunidade_tradicional: string;
  data_inicio: string | null;
  data_fim: string | null;
  valor_aprovado: number;
  criado_em: string;
}

export const CATEGORIAS = [
  "Música", "Artesanato", "Cultura Caiçara", "Artes Visuais", 
  "Audiovisual", "Dança", "Literatura", "Patrimônio Imaterial",
  "Artes Cênicas", "Agentes Culturais", "Grupos e Coletivos", "Espaços Culturais"
];

export const BAIRROS = [
  "Perequê", "Vila", "Armação", "Jabaquara", "Curral", 
  "Veloso", "São Pedro", "Itaquanduba", "Itaguaçu", "Reino", "Castelhanos", "Bonete", "Piúva", "Cocaia", "Água Branca"
];

export function formatBRL(valor: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
}

export function getTipoDoc(doc: string): "PF" | "PJ" | "N/I" {
  const d = doc.replace(/\D/g, "");
  if (d.length === 11) return "PF";
  if (d.length === 14) return "PJ";
  return "N/I";
}

export { COMUNIDADES_TRADICIONAIS };