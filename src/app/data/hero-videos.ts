/**
 * Vídeos de fundo do hero na Home.
 *
 * `import.meta.glob` **sem** `eager: true` — os URLs resolvem-se em runtime (chunks pequenos),
 * em vez de empacotar todas as referências no bundle inicial.
 *
 * Produção: use `VITE_HERO_VIDEO_URLS` com ficheiros leves em `public/videos/` (ex.: `.mp4` ~2–8MB)
 * em vez de `.MOV` muito grandes no repositório.
 */

const heroVideoFilePattern = /\.(mp4|webm|mov|m4v)$/i;

const heroVideoModules = import.meta.glob(
  ['./mapeamento-2020-videos/*', './mapeamento 2020 - videos/*', './data-mapeamento 2020 - videos/*', './videos/*'],
  {
    query: '?url',
    import: 'default',
  }
) as Record<string, () => Promise<string>>;

const configuredHeroVideos = String(import.meta.env.VITE_HERO_VIDEO_URLS || '')
  .split(',')
  .map((url) => url.trim())
  .filter((url) => heroVideoFilePattern.test(url));

/** Resolve todos os URLs (ficheiros locais + env). Chamar uma vez no mount da Home. */
export async function loadHeroBackgroundVideoUrls(): Promise<string[]> {
  const entries = Object.entries(heroVideoModules)
    .filter(([path]) => heroVideoFilePattern.test(path))
    .sort(([a], [b]) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  const fromGlob = await Promise.all(entries.map(([, load]) => load()));
  return [...fromGlob, ...configuredHeroVideos];
}
