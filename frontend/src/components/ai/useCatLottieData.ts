import { useEffect, useState } from 'react'

/** Public Lottie asset (Vite `public/`). */
export const AI_ASSISTANT_CAT_LOTTIE_PATH = '/Loader cat (1).json'

let cached: object | undefined
let inflight: Promise<object> | undefined

function loadCatLottie(): Promise<object> {
  if (cached) return Promise.resolve(cached)
  if (!inflight) {
    inflight = fetch(encodeURI(AI_ASSISTANT_CAT_LOTTIE_PATH))
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load Lottie: ${r.status}`)
        return r.json()
      })
      .then((data) => {
        cached = data
        return data
      })
      .finally(() => {
        inflight = undefined
      })
  }
  return inflight
}

/** Shared animation data for the floating cat and the welcome block. */
export function useCatLottieData(): object | null {
  const [data, setData] = useState<object | null>(() => cached ?? null)

  useEffect(() => {
    let cancelled = false
    loadCatLottie().then((d) => {
      if (!cancelled) setData(d)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return data
}
