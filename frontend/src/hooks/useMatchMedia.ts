import { useEffect, useState } from 'react'

/** Subscribes to `window.matchMedia(query)`; SSR-safe default `false`. */
export function useMatchMedia(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false,
  )

  useEffect(() => {
    const mq = window.matchMedia(query)
    const onChange = () => setMatches(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [query])

  return matches
}

/** Student portal mobile breakpoint (aligned with existing `768px` rules in `portal.css`). */
export function useIsNarrowMobile(): boolean {
  return useMatchMedia('(max-width: 768px)')
}
