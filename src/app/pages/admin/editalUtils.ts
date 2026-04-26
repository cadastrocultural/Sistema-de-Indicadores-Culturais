import { LINKS_EDITAIS } from './constants';

// Busca links por nome fuzzy
export const findEditalLinks = (nomeEdital: string, customLinks?: Record<string, { resultado?: string; resumo?: string; diarioOficial?: string }>) => {
  // 1) Verifica links customizados primeiro (inseridos pelo admin)
  if (customLinks && customLinks[nomeEdital]) {
    const cl = customLinks[nomeEdital];
    if (cl.resultado || cl.resumo || cl.diarioOficial) return cl;
  }
  
  const norm = nomeEdital.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

  // 2) Busca fuzzy nos links customizados (antes dos hardcoded, para priorizar o Admin)
  if (customLinks) {
    for (const [key, cl] of Object.entries(customLinks)) {
      const keyNorm = key.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
      if (norm.includes(keyNorm) || keyNorm.includes(norm)) {
        if (cl.resultado || cl.resumo || cl.diarioOficial) return cl;
      }
    }
  }

  // 3) Lei Paulo Gustavo + 2023 no nome → pasta do Drive (evita cair no LPG genérico só com "Paulo Gustavo")
  if (/\bpaulo gustavo\b/.test(norm) && /\b2023\b/.test(norm)) {
    const lpg2023 = LINKS_EDITAIS['Lei Paulo Gustavo (2023)'];
    if (lpg2023 && (lpg2023.resultado || lpg2023.resumo || lpg2023.diarioOficial)) {
      return lpg2023;
    }
  }

  // 4) Resultados oficiais da Aldir Blanc/Mapeamento 2020.
  if (/\b2020\b/.test(norm)) {
    if (norm.includes('fomento') || norm.includes('projetos culturais') || norm.includes('221')) {
      return LINKS_EDITAIS['Edital de Fomento (2020)'];
    }
    if (norm.includes('agentes culturais') || norm.includes('premiacao de agentes') || norm.includes('198')) {
      return LINKS_EDITAIS['Edital de Premiação de Agentes Culturais (2020)'];
    }
    if (norm.includes('grupos') || norm.includes('coletivos') || norm.includes('201')) {
      return LINKS_EDITAIS['Edital de Grupos e Coletivos (2020)'];
    }
    if (norm.includes('espacos') || norm.includes('espaços') || norm.includes('220')) {
      return LINKS_EDITAIS['Edital de Espaços Culturais (2020)'];
    }
  }

  // 5) Busca nos links hardcoded
  for (const [key, links] of Object.entries(LINKS_EDITAIS)) {
    const keyNorm = key.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    if (norm === keyNorm || norm.includes(keyNorm) || keyNorm.includes(norm)) return links;
    if ((norm.includes('221') && keyNorm.includes('221')) ||
        (norm.includes('pnab') && keyNorm.includes('pnab')) ||
        (norm.includes('aldir blanc') && keyNorm.includes('aldir blanc')) ||
        (norm.includes('paulo gustavo') && keyNorm.includes('paulo gustavo')) ||
        (norm.includes('pec') && keyNorm.includes('pec'))) {
      return links;
    }
  }
  
  return null;
};
