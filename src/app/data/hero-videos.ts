/**
 * Vídeos de fundo do hero na Home (atrás do título “Cadastro Cultural de Ilhabela”).
 *
 * ONDE COLOCAR OS FICHEIROS (organizado):
 *   src/app/data/videos/
 * Coloque aqui os `.mp4`, `.webm`, `.mov` / `.MOV`, `.m4v`. Não precisa editar a lista abaixo:
 * os URLs são gerados automaticamente para todos os ficheiros dessa pasta (exceto
 * ficheiros que não sejam vídeo).
 *
 * Nota: vídeos muito grandes (centenas de MB) pesam no build e no primeiro carregamento;
 * para produção, considere comprimir ou usar ficheiros em `public/videos/` com URLs `/videos/...`.
 */

const heroVideoFilePattern = /\.(mp4|webm|mov|m4v)$/i;

const heroVideoModules = import.meta.glob('./videos/*', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

export const HERO_BACKGROUND_VIDEO_URLS: string[] = Object.entries(heroVideoModules)
  .filter(([path]) => heroVideoFilePattern.test(path))
  .sort(([a], [b]) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
  .map(([, url]) => url);
