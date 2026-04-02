/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Backend origin without a trailing slash (see `.env.development` / `.env.production`).
   * When unset, API requests use relative `/api/...` (Vite dev proxy or same-origin deployment).
   */
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
