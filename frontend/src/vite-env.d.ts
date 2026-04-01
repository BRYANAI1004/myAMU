/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Backend origin without a trailing slash, e.g. `https://api.example.com` or `http://127.0.0.1:3001`.
   * When unset, API requests use relative `/api/...` (Vite dev proxy or same-origin deployment).
   */
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
