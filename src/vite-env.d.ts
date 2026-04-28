/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ADMIN_PIN?: string;
  /** Ex.: https://xxxx.supabase.co */
  readonly VITE_SUPABASE_URL?: string;
  /** Chave pública (anon) — nunca a service_role no cliente */
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

declare module 'figma:asset/*' {
  const src: string;
  export default src;
}
