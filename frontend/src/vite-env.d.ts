/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

/** Injected in `vite.config.ts` for deploy/debug correlation (console only). */
declare const __MYAMU_BUILD_ID__: string

interface ImportMetaEnv {
  /**
   * Backend origin without a trailing slash and without `/api` (see `.env.development` / `.env.production`).
   * Required at build time; requests use `${VITE_API_BASE_URL}/api/...`.
   */
  readonly VITE_API_BASE_URL: string
  readonly VITE_AUTHORIZE_API_LOGIN_ID?: string
  readonly VITE_AUTHORIZE_CLIENT_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
