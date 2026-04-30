/**
 * COORDENADAS GEOGRÁFICAS DOS BAIRROS DE ILHABELA
 * Fonte: dados oficiais / referências geográficas do município
 * Revisão: 2026-04 — coordenadas validadas por zonas geográficas reais
 */

export interface BairroCoord {
  nome: string;
  lat: number;
  lng: number;
  zona?: string;
}

export const BAIRROS_ILHABELA: BairroCoord[] = [
  // ── Região Central e Urbana (face oeste / Canal de São Sebastião) ───────
  { nome: 'Vila',              lat: -23.7781, lng: -45.3581, zona: 'Centro' },
  { nome: 'Centro',            lat: -23.7781, lng: -45.3581, zona: 'Centro' },
  { nome: 'Saco da Capela',    lat: -23.7738, lng: -45.3574, zona: 'Centro' },
  { nome: 'Pequea',            lat: -23.7685, lng: -45.3542, zona: 'Centro' },
  { nome: 'Santa Tereza',      lat: -23.7726, lng: -45.3556, zona: 'Centro' },
  { nome: 'Green Park',        lat: -23.7895, lng: -45.3545, zona: 'Centro' },
  { nome: 'Costa Bela',        lat: -23.7865, lng: -45.3505, zona: 'Centro' },
  { nome: 'Costa Bela II',     lat: -23.7875, lng: -45.3515, zona: 'Centro' },
  { nome: 'Ilhote',            lat: -23.8420, lng: -45.3840, zona: 'Sul' },
  { nome: 'Ilhota',            lat: -23.8420, lng: -45.3840, zona: 'Sul' },
  { nome: 'Morro do Cantagalo', lat: -23.7968, lng: -45.3698, zona: 'Centro' },
  { nome: 'Mansa',             lat: -23.7898, lng: -45.3612, zona: 'Centro' },   // praia calma, face oeste
  { nome: 'Praia Mansa',       lat: -23.7898, lng: -45.3612, zona: 'Centro' },   // face oeste (canal)

  // Bairros Centro-Sul (entre Vila e Perequê)
  { nome: 'Itaquanduba',       lat: -23.7900, lng: -45.3600, zona: 'Centro-Sul' },
  { nome: 'Itaguassu',         lat: -23.8000, lng: -45.3600, zona: 'Centro-Sul' },
  { nome: 'Engenho d\'Água',   lat: -23.7870, lng: -45.3590, zona: 'Centro-Sul' },
  { nome: 'Cabaraú',           lat: -23.7925, lng: -45.3595, zona: 'Centro-Sul' },
  { nome: 'Praia Grande',      lat: -23.7980, lng: -45.3620, zona: 'Centro-Sul' },
  { nome: 'Boa Vista',         lat: -23.8030, lng: -45.3625, zona: 'Centro-Sul' },
  { nome: 'Cocaia',            lat: -23.8200, lng: -45.3500, zona: 'Centro-Sul' },
  { nome: 'Água Branca',       lat: -23.8200, lng: -45.3400, zona: 'Centro-Sul' },
  { nome: 'Perequê',           lat: -23.8100, lng: -45.3600, zona: 'Centro-Sul' },
  { nome: 'Pereque',           lat: -23.8100, lng: -45.3600, zona: 'Centro-Sul' },
  { nome: 'Barra Velha',       lat: -23.8400, lng: -45.3800, zona: 'Centro-Sul' },
  { nome: 'Zabumba',           lat: -23.8400, lng: -45.3800, zona: 'Centro-Sul' },
  { nome: 'Barra Velha Alta',  lat: -23.8400, lng: -45.3800, zona: 'Centro-Sul' },
  { nome: 'Morro dos Mineiros', lat: -23.8125, lng: -45.3635, zona: 'Centro-Sul' },
  { nome: 'São Pedro',         lat: -23.7950, lng: -45.3590, zona: 'Centro-Sul' },
  { nome: 'Reino',             lat: -23.8250, lng: -45.3550, zona: 'Centro-Sul' },
  { nome: 'Figueira',          lat: -23.8440, lng: -45.2630, zona: 'Leste' },    // face oceânica!
  { nome: 'Tocas',             lat: -23.8260, lng: -45.3520, zona: 'Centro-Sul' },
  { nome: 'Ilha da Cabras',    lat: -23.8220, lng: -45.3740, zona: 'Centro-Sul' },
  { nome: 'Ilha das Cabras',   lat: -23.8220, lng: -45.3740, zona: 'Centro-Sul' },

  // ── Região Norte (face oeste / Canal) ───────────────────────────────────
  { nome: 'Viana',             lat: -23.7650, lng: -45.3520, zona: 'Norte' },
  { nome: 'Siriúba',           lat: -23.7400, lng: -45.3500, zona: 'Norte' },
  { nome: 'Siriúba II',        lat: -23.7400, lng: -45.3500, zona: 'Norte' },
  { nome: 'Armação',           lat: -23.7200, lng: -45.3400, zona: 'Norte' },
  { nome: 'Itaguaçu',          lat: -23.7425, lng: -45.3385, zona: 'Norte' },
  { nome: 'Ponta das Canas',   lat: -23.7150, lng: -45.3450, zona: 'Norte' },
  { nome: 'Pacuíba',           lat: -23.7250, lng: -45.3350, zona: 'Norte' },
  { nome: 'Pacoíba',           lat: -23.7250, lng: -45.3350, zona: 'Norte' },
  { nome: 'Ponta Azeda',       lat: -23.7098, lng: -45.3198, zona: 'Norte' },
  { nome: 'Praia do Pinto',    lat: -23.7698, lng: -45.3525, zona: 'Norte' },
  { nome: 'Barra do Pinto',    lat: -23.7715, lng: -45.3538, zona: 'Norte' },

  // ── Região Sul (face oeste / Canal — praias famosas) ────────────────────
  { nome: 'Feiticeira',        lat: -23.8500, lng: -45.4000, zona: 'Sul' },
  { nome: 'Praia da Feiticeira', lat: -23.8500, lng: -45.4000, zona: 'Sul' },
  { nome: 'Portinho',          lat: -23.8450, lng: -45.3900, zona: 'Sul' },
  { nome: 'Julião',            lat: -23.8425, lng: -45.3846, zona: 'Sul' },
  { nome: 'Veloso',            lat: -23.8528, lng: -45.3892, zona: 'Sul' },
  { nome: 'Curral',            lat: -23.8800, lng: -45.4200, zona: 'Sul' },
  { nome: 'Taubaté',           lat: -23.9000, lng: -45.4250, zona: 'Sul' },
  { nome: 'Borrifos',          lat: -23.9150, lng: -45.4300, zona: 'Sul' },
  { nome: 'Ponta da Sela',     lat: -23.8498, lng: -45.3825, zona: 'Sul' },
  { nome: 'Garapocaia',        lat: -23.8545, lng: -45.3898, zona: 'Sul' },
  { nome: 'Pedra Miúda',       lat: -23.8522, lng: -45.3918, zona: 'Sul' },
  { nome: 'Itapecerica',       lat: -23.8530, lng: -45.3910, zona: 'Sul' },
  { nome: 'Piúva',             lat: -23.8350, lng: -45.3730, zona: 'Sul' },
  { nome: 'Bexiga',            lat: -23.8385, lng: -45.3730, zona: 'Sul' },
  { nome: 'Eustáquio',         lat: -23.8312, lng: -45.3698, zona: 'Sul' },
  { nome: 'Ponta da Sepituba', lat: -23.8312, lng: -45.3698, zona: 'Sul' },

  // ── Lado Oceânico (face leste / Atlântico) — acesso por trilha ou barco ─
  { nome: 'Castelhanos',       lat: -23.8528, lng: -45.2917, zona: 'Leste' },
  { nome: 'Canto do Ribeirão', lat: -23.8550, lng: -45.2850, zona: 'Leste' },   // núcleo de Castelhanos
  { nome: 'Canto da Lagoa',    lat: -23.8500, lng: -45.2920, zona: 'Leste' },   // núcleo de Castelhanos
  { nome: 'Praia Mansa do Bonete', lat: -23.8340, lng: -45.2770, zona: 'Sul-Leste' },
  { nome: 'Praia Vermelha',    lat: -23.8375, lng: -45.2715, zona: 'Sul-Leste' },
  { nome: 'Vermelha',          lat: -23.8375, lng: -45.2715, zona: 'Sul-Leste' },
  { nome: 'Praia da Figueira', lat: -23.8440, lng: -45.2630, zona: 'Leste' },
  { nome: 'Saco do Sombrio',   lat: -23.8860, lng: -45.2480, zona: 'Sul-Leste' },
  { nome: 'Bonete',            lat: -23.9205, lng: -45.3262, zona: 'Sul-Leste' },
  { nome: 'Praia Mansa Bonete', lat: -23.8340, lng: -45.2770, zona: 'Sul-Leste' },
  { nome: 'Enchovas',          lat: -23.8585, lng: -45.2898, zona: 'Sul-Leste' },
  { nome: 'Indaiaúba',         lat: -23.8298, lng: -45.3285, zona: 'Sul-Leste' },
  { nome: 'Saco do Indaiá',    lat: -23.8310, lng: -45.3300, zona: 'Sul-Leste' },
  { nome: 'Serraria',          lat: -23.8050, lng: -45.2320, zona: 'Centro-Leste' },
  { nome: 'Jabaquara',         lat: -23.7300, lng: -45.2900, zona: 'Norte-Leste' },
  { nome: 'Guanxuma',          lat: -23.7740, lng: -45.2420, zona: 'Norte-Leste' },
  { nome: 'Guanxumas',         lat: -23.7740, lng: -45.2420, zona: 'Norte-Leste' },
  { nome: 'Fome',              lat: -23.7430, lng: -45.2740, zona: 'Norte-Leste' },
  { nome: 'Praia da Fome',     lat: -23.7430, lng: -45.2740, zona: 'Norte-Leste' },
  { nome: 'Praia do Gato',     lat: -23.7198, lng: -45.2985, zona: 'Norte-Leste' },
  { nome: 'Simão',             lat: -23.7570, lng: -45.2880, zona: 'Norte-Leste' },
  { nome: 'Praia do Simão',    lat: -23.7570, lng: -45.2880, zona: 'Norte-Leste' },
  { nome: 'Ponta das Calhetas', lat: -23.8568, lng: -45.2865, zona: 'Sul-Leste' },
  { nome: 'Poço/Itapema',      lat: -23.8568, lng: -45.2865, zona: 'Sul-Leste' },
  { nome: 'Ponta do Bananal',  lat: -23.7045, lng: -45.2845, zona: 'Norte-Leste' },

  // ── Arquipélago — ilhas oceânicas (sem ligação por terra) ───────────────
  { nome: 'Ilha de Vitória',   lat: -23.7440, lng: -45.0264, zona: 'Arquipélago' },
  { nome: 'Ilha da Vitória',   lat: -23.7440, lng: -45.0264, zona: 'Arquipélago' },
  { nome: 'Ilha de Búzios',    lat: -23.8000, lng: -45.1400, zona: 'Arquipélago' },
  { nome: 'Ilha dos Búzios',   lat: -23.8000, lng: -45.1400, zona: 'Arquipélago' },

  // ── 18 Comunidades Tradicionais Oficiais de Ilhabela ────────────────────
  // Fonte: Prefeitura de Ilhabela — face oceânica ou ilhas remotas
  { nome: 'Vitória',           lat: -23.7440, lng: -45.0264, zona: 'Comunidade Tradicional' }, // Ilha de Vitória
  { nome: 'Porto do Meio',     lat: -23.8000, lng: -45.1400, zona: 'Comunidade Tradicional' }, // Ilha dos Búzios
  { nome: 'Guanxumas de Búzios', lat: -23.8000, lng: -45.1400, zona: 'Comunidade Tradicional' }, // Ilha dos Búzios
  { nome: 'Pitangueiras',      lat: -23.7865, lng: -45.3595, zona: 'Comunidade Tradicional' },
];

// ── Normalização auxiliar ────────────────────────────────────────────────
function normalizeString(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

const BAIRRO_ALIASES: Record<string, string> = {
  // Variações ortográficas e apelidos comuns
  velo: 'Veloso',
  veloso: 'Veloso',
  pereque: 'Perequê',
  itaquanduba: 'Itaquanduba',
  itaguacu: 'Itaguaçu',
  itaguassu: 'Itaguassu',
  aguabranca: 'Água Branca',
  'agua branca': 'Água Branca',
  'saco da capela': 'Saco da Capela',
  'santa teresa': 'Santa Tereza',
  juliao: 'Julião',
  giuliao: 'Julião',
  siriuba: 'Siriúba',
  'siriuba ii': 'Siriúba II',
  'siriuba 2': 'Siriúba II',
  'ilha bela': 'Centro',
  ilhabela: 'Centro',
  'ilhabela/sp': 'Centro',
  'ilhabela - sp': 'Centro',
  itapecerica: 'Itapecerica',
  piuva: 'Piúva',
  simao: 'Simão',
  'ilha da cabras': 'Ilha da Cabras',
  'ilha das cabras': 'Ilha das Cabras',
  zabumba: 'Zabumba',
  'barra velha alta': 'Barra Velha Alta',
  'morro dos mineiros': 'Morro dos Mineiros',
  'boa vista': 'Boa Vista',
  'saco do indaia': 'Saco do Indaiá',
  'centro/vila': 'Centro',
  'centro vila': 'Centro',
  pacuiba: 'Pacuíba',
  pacoiba: 'Pacoíba',
  borrifos: 'Borrifos',
  taubate: 'Taubaté',
  jabaquara: 'Jabaquara',
  'ilha de vitoria': 'Ilha de Vitória',
  'ilha da vitoria': 'Ilha da Vitória',
  'ilha de buzios': 'Ilha de Búzios',
  'ilha dos buzios': 'Ilha dos Búzios',
  castelhanos: 'Castelhanos',
  bonete: 'Bonete',
  'saco do sombrio': 'Saco do Sombrio',
  armacao: 'Armação',
  'ponta das canas': 'Ponta das Canas',
  'praia vermelha': 'Praia Vermelha',
  vermelha: 'Vermelha',
  figueira: 'Figueira',
  'praia da figueira': 'Praia da Figueira',
  serraria: 'Serraria',
  guanxuma: 'Guanxuma',
  guanxumas: 'Guanxumas',
  'guanxumas de buzios': 'Guanxumas de Búzios',
  tocas: 'Tocas',
  'canto do ribeirao': 'Canto do Ribeirão',
  'canto da lagoa': 'Canto da Lagoa',
};

export function getBairroCoords(bairro: string): { lat: number; lng: number } | null {
  if (!bairro) return null;

  const searchRaw = normalizeString(bairro).replace(/\s+/g, ' ').trim();
  const searchNoSpace = searchRaw.replace(/\s+/g, '');
  const alias = BAIRRO_ALIASES[searchRaw] || BAIRRO_ALIASES[searchNoSpace];
  const search = alias ? normalizeString(alias) : searchRaw;

  // 1. Busca exata normalizada
  let found = BAIRROS_ILHABELA.find((b) => normalizeString(b.nome) === search);

  // 2. Busca parcial (nome contido no oficial ou vice-versa)
  if (!found) {
    found = BAIRROS_ILHABELA.find((b) => {
      const oficial = normalizeString(b.nome);
      return oficial.includes(search) || search.includes(oficial);
    });
  }

  return found ? { lat: found.lat, lng: found.lng } : null;
}

const BAIRROS_POR_NOME_DEC: BairroCoord[] = [...BAIRROS_ILHABELA].sort(
  (a, b) => b.nome.length - a.nome.length,
);

export function looksLikeEnderecoCompleto(s: string): boolean {
  const t = (s || '').trim();
  if (t.length < 14) return false;
  const low = normalizeString(t);
  if (
    /^(rua|r\.|avenida|av\.|av |travessa|trav\.|rodovia|rod\.|estrada|estr\.|alameda|al\.|largo|pra[cç]a|praca|sitio|s[ií]tio)\b/.test(
      low,
    )
  )
    return true;
  if (/,/.test(t) && t.length >= 22) return true;
  if (
    /\b(n[oº°]|n°|numero|num\.|n\.\s*n)\s*\d{1,5}\b/i.test(t) &&
    (low.includes('ilhabela') || low.includes('sp'))
  )
    return true;
  if (
    /\b(n[oº°]|n°|numero|num\.)\s*\d{1,5}\b/i.test(t) &&
    (low.includes('rua') || low.includes('av ') || low.includes('av.'))
  )
    return true;
  return false;
}

export function extrairBairroConhecidoDoTexto(texto: string): string | null {
  if (!texto?.trim()) return null;
  const t = normalizeString(texto);
  for (const b of BAIRROS_POR_NOME_DEC) {
    const bn = normalizeString(b.nome);
    if (bn.length >= 3 && t.includes(bn)) return b.nome;
  }
  return null;
}

export function canonicalBairroIlhabela(bairroField: string, enderecoCompleto?: string): string {
  const b0 = (bairroField || '').replace(/,\s*$/, '').trim();
  const e0 = (enderecoCompleto || '').trim();
  const combined = [b0, e0].filter(Boolean).join(' ');

  if (b0 && !looksLikeEnderecoCompleto(b0)) {
    const exact = getBairroCoords(b0);
    if (exact) {
      const found = BAIRROS_ILHABELA.find(
        (x) => Math.abs(x.lat - exact.lat) < 1e-5 && Math.abs(x.lng - exact.lng) < 1e-5,
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

export function geocodificarEndereco(endereco: string): { lat: number; lng: number } | null {
  if (!endereco) return null;
  const enderecoNorm = normalizeString(endereco);
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

function coordenadasUteisMapaIlhabela(lat: unknown, lng: unknown): boolean {
  const la = Number(lat);
  const ln = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(ln)) return false;
  if (Math.abs(la) < 1e-6 && Math.abs(ln) < 1e-6) return false;
  return hasCoordsInIlhabelaBounds(la, ln);
}

export function coordsTemPinNoMapaIlhabela(
  lat: number | null | undefined,
  lng: number | null | undefined,
): boolean {
  return coordenadasUteisMapaIlhabela(lat, lng);
}

export function resolveCoordsForIlhabela(
  bairroField: string,
  latRaw: unknown,
  lngRaw: unknown,
  enderecoCompleto?: string,
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

export function getBairrosPorZona(zona: string): BairroCoord[] {
  return BAIRROS_ILHABELA.filter((b) => b.zona === zona);
}

export const NOMES_BAIRROS = BAIRROS_ILHABELA.map((b) => b.nome).sort();

export const STATS_BAIRROS = {
  total: BAIRROS_ILHABELA.length,
  zonas: {
    Centro: getBairrosPorZona('Centro').length,
    Norte: getBairrosPorZona('Norte').length,
    Sul: getBairrosPorZona('Sul').length,
    Leste: getBairrosPorZona('Leste').length,
    'Norte-Leste': getBairrosPorZona('Norte-Leste').length,
    'Sul-Leste': getBairrosPorZona('Sul-Leste').length,
    'Centro-Leste': getBairrosPorZona('Centro-Leste').length,
    Arquipélago: getBairrosPorZona('Arquipélago').length,
  },
};

// Centro da Vila — cidade principal de Ilhabela
export const ILHABELA_CENTER = {
  lat: -23.7781,
  lng: -45.3581,
  zoom: 11,
};

// Limites geográficos do arquipélago completo de Ilhabela
// West: -45.44 cobre praias sul (Taubaté/Borrifos ≈ -45.43)
// East: -44.90 cobre Ilha de Vitória (-45.0264) e Ilha de Búzios (-45.14)
export const ILHABELA_BOUNDS = {
  north: -23.68,
  south: -23.93,
  west:  -45.44,
  east:  -44.90,
};
