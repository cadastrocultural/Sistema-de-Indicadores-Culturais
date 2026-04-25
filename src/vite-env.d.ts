/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ADMIN_PIN?: string;
}

declare module 'figma:asset/*' {
  const src: string;
  export default src;
}
