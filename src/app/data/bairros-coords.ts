/**
 * COORDENADAS GEOGRÁFICAS DOS BAIRROS DE ILHABELA
 * Dados baseados em localizações reais do município
 */

export interface BairroCoord {
  nome: string;
  lat: number;
  lng: number;
  zona?: string;
}

export const BAIRROS_ILHABELA: BairroCoord[] = [
  // Região Central
  { nome: 'Vila', lat: -23.7784, lng: -45.3581, zona: 'Centro' },
  { nome: 'Centro', lat: -23.7784, lng: -45.3581, zona: 'Centro' },
  { nome: 'Perequê', lat: -23.8138, lng: -45.3661, zona: 'Centro-Sul' },
  { nome: 'Barra Velha', lat: -23.8056, lng: -45.3630, zona: 'Centro-Sul' },
  { nome: 'Itaquanduba', lat: -23.8042, lng: -45.3623, zona: 'Centro-Sul' },
  
  // Região Sul
  { nome: 'São Pedro', lat: -23.7950, lng: -45.3590, zona: 'Sul' },
  { nome: 'Saco da Capela', lat: -23.7738, lng: -45.3574, zona: 'Centro' },
  { nome: 'Feiticeira', lat: -23.8465, lng: -45.3798, zona: 'Sul' },
  { nome: 'Portinho', lat: -23.8388, lng: -45.3827, zona: 'Sul' },
  { nome: 'Curral', lat: -23.8520, lng: -45.3865, zona: 'Sul' },
  
  // Região Norte
  { nome: 'Viana', lat: -23.7650, lng: -45.3520, zona: 'Norte' },
  { nome: 'Armação', lat: -23.7512, lng: -45.3445, zona: 'Norte' },
  { nome: 'Itaguaçu', lat: -23.7425, lng: -45.3385, zona: 'Norte' },
  { nome: 'Ponta das Canas', lat: -23.7298, lng: -45.3312, zona: 'Norte' },
  { nome: 'Pacuíba', lat: -23.7165, lng: -45.3245, zona: 'Norte' },
  { nome: 'Ponta Azeda', lat: -23.7098, lng: -45.3198, zona: 'Norte' },
  
  // Praias Lado Oeste (Canal)
  { nome: 'Engenho d\'Água', lat: -23.7918, lng: -45.3608, zona: 'Centro-Sul' },
  { nome: 'Pereque', lat: -23.8138, lng: -45.3661, zona: 'Centro-Sul' },
  { nome: 'Pequea', lat: -23.7685, lng: -45.3542, zona: 'Centro' },
  { nome: 'Veloso', lat: -23.8561, lng: -45.3892, zona: 'Sul' },
  { nome: 'Reino', lat: -23.7745, lng: -45.3568, zona: 'Centro' },
  
  // Lado Leste (Praias Oceânicas - Coordenadas Reais do Google Maps)
  { nome: 'Castelhanos', lat: -23.8145, lng: -45.2568, zona: 'Leste' },
  { nome: 'Bonete', lat: -23.8912, lng: -45.3198, zona: 'Sul-Leste' },
  { nome: 'Enchovas', lat: -23.8585, lng: -45.2898, zona: 'Sul-Leste' },
  { nome: 'Indaiaúba', lat: -23.8298, lng: -45.3285, zona: 'Sul-Leste' },
  { nome: 'Guanxuma', lat: -23.7385, lng: -45.2965, zona: 'Norte-Leste' },
  { nome: 'Fome', lat: -23.7312, lng: -45.2895, zona: 'Norte-Leste' },
  { nome: 'Serraria', lat: -23.7825, lng: -45.3145, zona: 'Centro-Leste' },
  
  // 18 COMUNIDADES TRADICIONAIS OFICIAIS DE ILHABELA
  // Fonte: Prefeitura de Ilhabela
  { nome: 'Vitória', lat: -23.7785, lng: -45.3542, zona: 'Comunidade Tradicional' },
  { nome: 'Guanxumas de Búzios', lat: -23.8165, lng: -45.3425, zona: 'Comunidade Tradicional' },
  { nome: 'Porto do Meio', lat: -23.7698, lng: -45.3525, zona: 'Comunidade Tradicional' },
  { nome: 'Pitangueiras', lat: -23.7865, lng: -45.3595, zona: 'Comunidade Tradicional' },
  { nome: 'Vermelha', lat: -23.7128, lng: -45.2912, zona: 'Comunidade Tradicional' },
  { nome: 'Mansa', lat: -23.7898, lng: -45.3612, zona: 'Comunidade Tradicional' },
  { nome: 'Canto do Ribeirão', lat: -23.7968, lng: -45.3698, zona: 'Comunidade Tradicional' },
  { nome: 'Canto da Lagoa', lat: -23.8456, lng: -45.2945, zona: 'Comunidade Tradicional' },
  { nome: 'Bonete', lat: -23.8912, lng: -45.3198, zona: 'Comunidade Tradicional' },
  { nome: 'Eustáquio', lat: -23.8312, lng: -45.3698, zona: 'Comunidade Tradicional' },
  { nome: 'Guanxuma', lat: -23.7385, lng: -45.2965, zona: 'Comunidade Tradicional' },
  { nome: 'Serraria', lat: -23.7825, lng: -45.3145, zona: 'Comunidade Tradicional' },
  { nome: 'Saco do Sombrio', lat: -23.8385, lng: -45.3742, zona: 'Comunidade Tradicional' },
  { nome: 'Enchovas', lat: -23.8585, lng: -45.2898, zona: 'Comunidade Tradicional' },
  { nome: 'Indaiaúba', lat: -23.8298, lng: -45.3285, zona: 'Comunidade Tradicional' },
  { nome: 'Figueira', lat: -23.8145, lng: -45.3585, zona: 'Comunidade Tradicional' },
  { nome: 'Fome', lat: -23.7312, lng: -45.2895, zona: 'Comunidade Tradicional' },
  { nome: 'Poço/Itapema', lat: -23.8568, lng: -45.2865, zona: 'Comunidade Tradicional' },
  { nome: 'Castelhanos', lat: -23.8145, lng: -45.2568, zona: 'Comunidade Tradicional' },
  
  // Outras Localidades
  { nome: 'Cocaia', lat: -23.8097, lng: -45.3605, zona: 'Centro-Sul' },
  { nome: 'Ilha de Vitória', lat: -23.7410, lng: -44.9670, zona: 'Arquipélago' }, // Ilha oceânica do arquipélago de Ilhabela, NE da ilha principal
  { nome: 'Água Branca', lat: -23.8118, lng: -45.3654, zona: 'Centro-Sul' },
  { nome: 'Morro do Cantagalo', lat: -23.7968, lng: -45.3698, zona: 'Centro' },
  { nome: 'Praia do Pinto', lat: -23.7698, lng: -45.3525, zona: 'Norte' },
  { nome: 'Barra do Pinto', lat: -23.7715, lng: -45.3538, zona: 'Norte' },
  { nome: 'Ponta da Sela', lat: -23.8498, lng: -45.3825, zona: 'Sul' },
  { nome: 'Praia da Fome', lat: -23.7312, lng: -45.2895, zona: 'Norte-Leste' },
  { nome: 'Praia Mansa', lat: -23.7898, lng: -45.3612, zona: 'Centro' },
  
  // Praias Adicionais (Lado Oeste)
  { nome: 'Praia Grande', lat: -23.8012, lng: -45.3598, zona: 'Centro-Sul' },
  { nome: 'Garapocaia', lat: -23.8545, lng: -45.3898, zona: 'Sul' },
  { nome: 'Praia da Feiticeira', lat: -23.8465, lng: -45.3798, zona: 'Sul' },
  { nome: 'Julião', lat: -23.8425, lng: -45.3846, zona: 'Sul' },
  { nome: 'Santa Tereza', lat: -23.7726, lng: -45.3556, zona: 'Centro' },
  { nome: 'Siriúba', lat: -23.7558, lng: -45.3469, zona: 'Norte' },
  { nome: 'Pedra Miúda', lat: -23.8522, lng: -45.3918, zona: 'Sul' },
  
  // Praias do Lado Leste (Complementares)
  { nome: 'Praia Mansa do Bonete', lat: -23.8898, lng: -45.3212, zona: 'Sul-Leste' },
  { nome: 'Praia do Gato', lat: -23.7198, lng: -45.2985, zona: 'Norte-Leste' },
  { nome: 'Jabaquara', lat: -23.7485, lng: -45.3065, zona: 'Norte-Leste' },
  
  // Localidades Específicas
  { nome: 'Ponta da Sepituba', lat: -23.8312, lng: -45.3698, zona: 'Sul' },
  { nome: 'Ponta das Calhetas', lat: -23.8568, lng: -45.2865, zona: 'Sul-Leste' },
  { nome: 'Ponta do Bananal', lat: -23.7045, lng: -45.2845, zona: 'Norte-Leste' },
  
  // Bairros e Localidades Adicionais (Corrigindo erros de georreferenciamento)
  { nome: 'Bexiga', lat: -23.8385, lng: -45.3730, zona: 'Sul' }, // CORRIGIDO: Sul da ilha (próximo ao Saco da Capela)
  { nome: 'Ilhote', lat: -23.7812, lng: -45.3568, zona: 'Centro' },
  { nome: 'Ilhota', lat: -23.7812, lng: -45.3568, zona: 'Centro' },
  { nome: 'Ilha de Búzios', lat: -23.7830, lng: -45.1280, zona: 'Arquipélago' }, // Ilha oceânica do arquipélago, leste da ilha principal
  { nome: 'Itaguassú', lat: -23.7445, lng: -45.3395, zona: 'Norte' }, // Variação de Itaguaçu
  { nome: 'Green Park', lat: -23.7895, lng: -45.3545, zona: 'Centro' },
  { nome: 'Costa Bela', lat: -23.7865, lng: -45.3505, zona: 'Centro' },
  { nome: 'Costa Bela II', lat: -23.7875, lng: -45.3515, zona: 'Centro' },
  { nome: 'Cabaraú', lat: -23.7925, lng: -45.3595, zona: 'Centro-Sul' },
  { nome: 'Taubaté', lat: -23.7784, lng: -45.3581, zona: 'Centro' }, // Provavelmente erro - usando Centro de Ilhabela

  // Localidades do Mapeamento 2020 / Pesquisas Culturais — ausentes da lista original
  { nome: 'Itapecerica', lat: -23.8530, lng: -45.3910, zona: 'Sul' }, // SW da ilha, entre Feiticeira e Curral (Av. Gov. Covas Jr.)
  { nome: 'Piúva', lat: -23.8350, lng: -45.3730, zona: 'Sul' }, // Sul, próximo a Praia Grande/Cocaia
  { nome: 'Simão', lat: -23.7570, lng: -45.2880, zona: 'Norte-Leste' }, // Praia do Simão — costa leste/NE
  { nome: 'Praia do Simão', lat: -23.7570, lng: -45.2880, zona: 'Norte-Leste' },
  { nome: 'Ilha da Cabras', lat: -23.8220, lng: -45.3740, zona: 'Centro-Sul' }, // Ilhota próxima à área de Perequê
  { nome: 'Ilha das Cabras', lat: -23.8220, lng: -45.3740, zona: 'Centro-Sul' },
  { nome: 'Zabumba', lat: -23.8065, lng: -45.3625, zona: 'Centro-Sul' }, // Sub-localidade de Barra Velha Alta
  { nome: 'Barra Velha Alta', lat: -23.8065, lng: -45.3625, zona: 'Centro-Sul' },
  { nome: 'Morro dos Mineiros', lat: -23.8125, lng: -45.3635, zona: 'Centro-Sul' }, // Morro próximo ao Perequê
  { nome: 'Boa Vista', lat: -23.8030, lng: -45.3625, zona: 'Centro-Sul' }, // Localidade próxima a Barra Velha
  { nome: 'Saco do Indaiá', lat: -23.8310, lng: -45.3300, zona: 'Sul-Leste' }, // Enseada próxima a Indaiaúba
];

// Função auxiliar para normalizar strings (remove acentos e espaços extras)
function normalizeString(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

const BAIRRO_ALIASES: Record<string, string> = {
  velo: 'Veloso',
  veloso: 'Veloso',
  pereque: 'Perequê',
  itaquanduba: 'Itaquanduba',
  itaguacu: 'Itaguaçu',
  itaguassu: 'Itaguaçu',
  aguabranca: 'Água Branca',
  'agua branca': 'Água Branca',
  'saco da capela': 'Saco da Capela',
  'santa teresa': 'Santa Tereza',
  juliao: 'Julião',
  giuliao: 'Julião', // Variação ortográfica encontrada em dados do mapeamento
  siriuba: 'Siriúba',
  'siriuba ii': 'Siriúba',
  'siriuba 2': 'Siriúba',
  'ilha bela': 'Centro',
  ilhabela: 'Centro',
  'ilhabela/sp': 'Centro',
  'ilhabela - sp': 'Centro',
  itapecerica: 'Itapecerica',
  piuva: 'Piúva',
  simao: 'Simão',
  'ilha da cabras': 'Ilha da Cabras',
  'ilha das cabras': 'Ilha da Cabras',
  zabumba: 'Zabumba',
  'barra velha alta': 'Zabumba',
  'morro dos mineiros': 'Morro dos Mineiros',
  'boa vista': 'Boa Vista',
  'saco do indaia': 'Saco do Indaiá',
  'centro/vila': 'Centro',
  'centro vila': 'Centro',
};

// Função para buscar coordenadas por nome de bairro
export function getBairroCoords(bairro: string): { lat: number; lng: number } | null {
  if (!bairro) return null;
  
  const searchRaw = normalizeString(bairro).replace(/\s+/g, ' ').trim();
  const searchNoSpace = searchRaw.replace(/\s+/g, '');
  const alias = BAIRRO_ALIASES[searchRaw] || BAIRRO_ALIASES[searchNoSpace];
  const search = alias ? normalizeString(alias) : searchRaw;
  
  // 1. Busca Exata Normalizada
  let found = BAIRROS_ILHABELA.find(b => normalizeString(b.nome) === search);
  
  // 2. Busca Parcial (bairro contido no nome oficial ou vice-versa)
  if (!found) {
    found = BAIRROS_ILHABELA.find(b => {
      const oficial = normalizeString(b.nome);
      return oficial.includes(search) || search.includes(oficial);
    });
  }
  
  return found ? { lat: found.lat, lng: found.lng } : null;
}

/** Bairros do catálogo, do nome mais longo ao mais curto (evita match frágil tipo "Pe" em "Pedreira"). */
const BAIRROS_POR_NOME_DEC: BairroCoord[] = [...BAIRROS_ILHABELA].sort(
  (a, b) => b.nome.length - a.nome.length
);

/**
 * Detecta se o texto parece logradouro/endereço completo (não apenas nome de bairro).
 */
export function looksLikeEnderecoCompleto(s: string): boolean {
  const t = (s || '').trim();
  if (t.length < 14) return false;
  const low = normalizeString(t);
  if (/^(rua|r\.|avenida|av\.|av |travessa|trav\.|rodovia|rod\.|estrada|estr\.|alameda|al\.|largo|pra[cç]a|praca|sitio|s[ií]tio)\b/.test(low)) return true;
  if (/,/.test(t) && t.length >= 22) return true;
  if (/\b(n[oº°]|n°|numero|num\.|n\.\s*n)\s*\d{1,5}\b/i.test(t) && (low.includes('ilhabela') || low.includes('sp'))) return true;
  if (/\b(n[oº°]|n°|numero|num\.)\s*\d{1,5}\b/i.test(t) && (low.includes('rua') || low.includes('av ') || low.includes('av.'))) return true;
  return false;
}

/** Retorna o primeiro nome oficial de bairro encontrado dentro do texto (endereço ou rótulo misto). */
export function extrairBairroConhecidoDoTexto(texto: string): string | null {
  if (!texto?.trim()) return null;
  const t = normalizeString(texto);
  for (const b of BAIRROS_POR_NOME_DEC) {
    const bn = normalizeString(b.nome);
    if (bn.length >= 3 && t.includes(bn)) return b.nome;
  }
  return null;
}

/**
 * Converte campo "bairro" + endereço em nome canônico da base de Ilhabela quando possível.
 * Se o campo vier como endereço e não houver match, retorna string vazia (evita inflar KPIs com ruas distintas).
 */
export function canonicalBairroIlhabela(bairroField: string, enderecoCompleto?: string): string {
  const b0 = (bairroField || '').replace(/,\s*$/, '').trim();
  const e0 = (enderecoCompleto || '').trim();
  const combined = [b0, e0].filter(Boolean).join(' ');

  if (b0 && !looksLikeEnderecoCompleto(b0)) {
    const exact = getBairroCoords(b0);
    if (exact) {
      const found = BAIRROS_ILHABELA.find(
        x => Math.abs(x.lat - exact.lat) < 1e-5 && Math.abs(x.lng - exact.lng) < 1e-5
      );
      if (found) return found.nome;
    }
  }

  const fromEnd = extrairBairroConhecidoDoTexto(e0);
  if (fromEnd) return fromEnd;
  const fromB = extrairBairroConhecidoDoTexto(b0);
  if (fromB) return fromB;
  const fromComb = extrairBairroConhecidoDoTexto(combined);
  if (fromComb) return fromComb;

  if (looksLikeEnderecoCompleto(b0)) return '';

  return b0;
}

// Função para geocodificar endereço completo (busca bairro dentro do texto)
export function geocodificarEndereco(endereco: string): { lat: number; lng: number } | null {
  if (!endereco) return null;

  const enderecoNorm = normalizeString(endereco);
  // Nomes mais longos primeiro (evita "Pe" em "Pedreira", "Reino" antes de "Reino...", etc.)
  for (const bairro of BAIRROS_POR_NOME_DEC) {
    const bairroNorm = normalizeString(bairro.nome);
    if (bairroNorm.length < 3) continue;
    if (enderecoNorm.includes(bairroNorm)) {
      return { lat: bairro.lat, lng: bairro.lng };
    }
  }

  return null;
}

const hasCoordsInIlhabelaBounds = (lat: number, lng: number): boolean =>
  lat >= ILHABELA_BOUNDS.south &&
  lat <= ILHABELA_BOUNDS.north &&
  lng >= ILHABELA_BOUNDS.west &&
  lng <= ILHABELA_BOUNDS.east;

/** Critério único de GPS aceite no mapa (igual ao usado dentro de resolveCoordsForIlhabela). */
function coordenadasUteisMapaIlhabela(lat: unknown, lng: unknown): boolean {
  const la = Number(lat);
  const ln = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(ln)) return false;
  if (Math.abs(la) < 1e-6 && Math.abs(ln) < 1e-6) return false;
  return hasCoordsInIlhabelaBounds(la, ln);
}

/**
 * Diz se lat/lng já gravados no item permitem desenhar o pino — **mesma regra** que
 * `resolveCoordsForIlhabela` aplica quando devolve coordenadas (não inventa valores).
 */
export function coordsTemPinNoMapaIlhabela(lat: number | null | undefined, lng: number | null | undefined): boolean {
  return coordenadasUteisMapaIlhabela(lat, lng);
}

/**
 * Resolve lat/lng para mapas (Dashboard etc.): bairro canônico, nome no endereço, geocodificação
 * e último recurso menção a Ilhabela sem bairro reconhecido → centro municipal (melhor que sem pino).
 */
export function resolveCoordsForIlhabela(
  bairroField: string,
  latRaw: unknown,
  lngRaw: unknown,
  enderecoCompleto?: string
): { lat: number | null; lng: number | null } {
  const end = String(enderecoCompleto || '').trim();
  const rawB = String(bairroField || '').trim();
  const mexerRawB = rawB === 'Não informado' ? '' : rawB;

  const ret = (lat: number, lng: number) => ({ lat, lng });

  const tryNome = (nome: string): { lat: number; lng: number } | null => {
    if (!nome?.trim()) return null;
    const g = getBairroCoords(nome.trim());
    if (g && coordenadasUteisMapaIlhabela(g.lat, g.lng)) return g;
    return null;
  };

  const canon = canonicalBairroIlhabela(mexerRawB, end);
  const bairroBusca = (canon || mexerRawB).trim();

  if (bairroBusca) {
    const g = tryNome(bairroBusca);
    if (g) return ret(g.lat, g.lng);
  }

  const merged = [end, mexerRawB].filter(Boolean).join(' ');
  const extra = extrairBairroConhecidoDoTexto(merged);
  if (extra) {
    const g = tryNome(extra);
    if (g) return ret(g.lat, g.lng);
  }

  if (end) {
    const geo = geocodificarEndereco(end);
    if (geo && coordenadasUteisMapaIlhabela(geo.lat, geo.lng)) return ret(geo.lat, geo.lng);
  }

  if (coordenadasUteisMapaIlhabela(latRaw, lngRaw)) return ret(Number(latRaw), Number(lngRaw));

  const hay = normalizeString(`${end} ${mexerRawB}`);
  const semBairroCanon = !canon;
  if (semBairroCanon && hay.includes('ilhabela') && hay.length <= 120) {
    return ret(ILHABELA_CENTER.lat, ILHABELA_CENTER.lng);
  }

  return { lat: null, lng: null };
}

// Função para obter lista de bairros por zona
export function getBairrosPorZona(zona: string): BairroCoord[] {
  return BAIRROS_ILHABELA.filter(b => b.zona === zona);
}

// Lista de nomes de bairros para autocomplete
export const NOMES_BAIRROS = BAIRROS_ILHABELA.map(b => b.nome).sort();

// Estatísticas de cobertura
export const STATS_BAIRROS = {
  total: BAIRROS_ILHABELA.length,
  zonas: {
    'Centro': getBairrosPorZona('Centro').length,
    'Norte': getBairrosPorZona('Norte').length,
    'Sul': getBairrosPorZona('Sul').length,
    'Leste': getBairrosPorZona('Leste').length,
    'Norte-Leste': getBairrosPorZona('Norte-Leste').length,
    'Sul-Leste': getBairrosPorZona('Sul-Leste').length,
    'Centro-Leste': getBairrosPorZona('Centro-Leste').length,
  }
};

// Coordenada central de Ilhabela (para mapas)
export const ILHABELA_CENTER = {
  lat: -23.7784,
  lng: -45.3581,
  zoom: 11
};

// Limites geográficos de Ilhabela (inclui ilhas oceânicas do arquipélago: Búzios e Vitória)
export const ILHABELA_BOUNDS = {
  north: -23.68,
  south: -23.93,
  west: -45.40,
  east: -44.90  // Expandido para incluir Ilha de Búzios (~-45.13) e Ilha de Vitória (~-44.97)
};