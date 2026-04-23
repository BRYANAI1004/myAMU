import { Workbox } from 'workbox-window'

declare const __MYAMU_BUILD_ID__: string

const UPDATE_CHECK_MS = 60 * 60 * 1000
/** Prevents tight reload loops if `activated` fires more than once in an edge case. */
const SW_RELOAD_GUARD_KEY = 'amu-pwa-sw-reload-guard-v1'

function serviceWorkerUrl(): string {
  const basePath = import.meta.env.BASE_URL || '/'
  const scopeBase = new URL(basePath, self.location.origin).href
  return new URL('sw.js', scopeBase).pathname
}

export function logFrontendBuildId(): void {
  try {
    console.info('[myAMU] frontend build:', __MYAMU_BUILD_ID__)
  } catch {
    // Ignore
  }
}

/**
 * Registers the app service worker with the same lifecycle expectations as
 * `virtual:pwa-register` auto-update mode, plus periodic update checks and a
 * sessionStorage guard around the post-update reload.
 */
export function registerMyAmuServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return

  const wb = new Workbox(serviceWorkerUrl(), {
    scope: import.meta.env.BASE_URL,
  })

  wb.addEventListener('activated', (event) => {
    if (!(event.isUpdate || event.isExternal)) return
    try {
      if (sessionStorage.getItem(SW_RELOAD_GUARD_KEY) === '1') return
      sessionStorage.setItem(SW_RELOAD_GUARD_KEY, '1')
    } catch {
      // sessionStorage may be unavailable; still reload once.
    }
    window.location.reload()
  })

  void wb
    .register({ immediate: true })
    .then((registration) => {
      if (!registration) return

      const check = () => {
        void registration.update().catch(() => {
          /* ignore transient network errors */
        })
      }

      check()
      window.setInterval(check, UPDATE_CHECK_MS)

      const onVisible = () => {
        if (document.visibilityState === 'visible') check()
      }
      document.addEventListener('visibilitychange', onVisible)

      window.addEventListener(
        'load',
        () => {
          try {
            sessionStorage.removeItem(SW_RELOAD_GUARD_KEY)
          } catch {
            // Ignore
          }
        },
        { once: true },
      )
    })
    .catch(() => {
      // Registration failed (e.g. SW blocked); app still runs without SW.
    })
}
