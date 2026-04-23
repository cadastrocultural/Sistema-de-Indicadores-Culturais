/**
 * Galeria pública — fotos do Mapeamento Cultural 2020.
 *
 * Coloque ficheiros em: `src/app/data/mapeamento-2020-gallery/`
 * (jpg, jpeg, png, webp). São incluídos automaticamente na ordem alfabética do nome.
 */

const ext = /\.(jpe?g|png|webp)$/i;

const modules = import.meta.glob('./mapeamento-2020-gallery/*', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

export const MAPEAMENTO_2020_GALLERY_URLS: string[] = Object.entries(modules)
  .filter(([path]) => ext.test(path))
  .sort(([a], [b]) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
  .map(([, url]) => url);
