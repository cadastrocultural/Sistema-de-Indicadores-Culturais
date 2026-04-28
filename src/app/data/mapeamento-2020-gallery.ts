/**
 * Galeria pública de fotos.
 *
 * Fotos versionadas entram em `src/app/data/mapeamento-2020-gallery/`.
 * O ano é inferido pelo nome/caminho do arquivo; quando não houver ano explícito,
 * usamos 2020 para preservar a galeria original do Mapeamento.
 */

export interface GalleryImage {
  id: string;
  url: string;
  year: string;
  title: string;
  /** Nome do artista (ou do agente retratado). Se vazio, a UI usa só `title`. */
  artist?: string;
  source: 'static' | 'uploaded';
}

/** Texto principal do crédito na galeria pública. */
export function galleryImageCredit(image: GalleryImage | null | undefined): string {
  if (!image) return '';
  const a = String(image.artist || '').trim();
  if (a) return a;
  return String(image.title || '').trim() || 'Foto';
}

const ext = /\.(jpe?g|png|webp)$/i;

const modules = import.meta.glob('./mapeamento-2020-gallery/*', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const inferYear = (path: string) => path.match(/(?:19|20)\d{2}/)?.[0] || '2020';

const formatTitle = (path: string, index: number) => {
  const fileName = path.split('/').pop()?.replace(/\.[^.]+$/, '') || `foto-${index + 1}`;
  return fileName.replace(/[_-]+/g, ' ').trim() || `Foto ${index + 1}`;
};

/**
 * Nome do artista por **nome do ficheiro** (ex.: `IMG_20201203_114221_927.jpg`).
 * Preencha conforme o acervo; chaves em falta usam só o título derivado do ficheiro.
 */
export const GALLERY_ARTIST_BY_FILENAME: Record<string, string> = {
  // Exemplo:
  // 'IMG_20201203_114221_927.jpg': 'Nome do artista ou coletivo',
};

export const STATIC_GALLERY_IMAGES: GalleryImage[] = Object.entries(modules)
  .filter(([path]) => ext.test(path))
  .sort(([a], [b]) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
  .map(([path, url], index) => {
    const fileName = path.split('/').pop() || '';
    const artistRaw = fileName ? GALLERY_ARTIST_BY_FILENAME[fileName] : undefined;
    const artist = artistRaw && String(artistRaw).trim() ? String(artistRaw).trim() : undefined;
    return {
      id: `static-${index}-${path}`,
      url,
      year: inferYear(path),
      title: formatTitle(path, index),
      artist,
      source: 'static' as const,
    };
  });

export const MAPEAMENTO_2020_GALLERY_URLS: string[] = STATIC_GALLERY_IMAGES
  .filter((image) => image.year === '2020')
  .map((image) => image.url);
