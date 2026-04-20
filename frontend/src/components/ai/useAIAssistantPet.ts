import { useCallback, useEffect, useState } from 'react'
import { AI_ASSISTANT_MOBILE_MEDIA } from './aiAssistantGeometry'

/** @deprecated Legacy keys; cleared on load — dock position uses `AI_DOCK_OFFSET_*` only. */
export const AI_CAT_STORAGE_X = 'amu-ai-cat-x'
/** @deprecated Legacy keys; cleared on load — dock position uses `AI_DOCK_OFFSET_*` only. */
export const AI_CAT_STORAGE_Y = 'amu-ai-cat-y'

/** Drag offset from the fixed bottom-right dock anchor (px). */
export const AI_DOCK_OFFSET_X = 'amu-ai-dock-offset-x'
export const AI_DOCK_OFFSET_Y = 'amu-ai-dock-offset-y'
/** Stored as the string `"true"` when hidden. */
export const AI_CAT_HIDDEN_KEY = 'amu-ai-cat-hidden'

export function readStoredDockOffset(): { dx: number; dy: number } | null {
  try {
    const xs = localStorage.getItem(AI_DOCK_OFFSET_X)
    const ys = localStorage.getItem(AI_DOCK_OFFSET_Y)
    if (xs == null || ys == null) return null
    const dx = Number(xs)
    const dy = Number(ys)
    if (!Number.isFinite(dx) || !Number.isFinite(dy)) return null
    return { dx, dy }
  } catch {
    return null
  }
}

export function persistDockOffset(dx: number, dy: number): void {
  try {
    localStorage.setItem(AI_DOCK_OFFSET_X, String(Math.round(dx)))
    localStorage.setItem(AI_DOCK_OFFSET_Y, String(Math.round(dy)))
  } catch {
    /* ignore quota / private mode */
  }
}

/** Clears legacy dock keys that stored absolute `left`/`top` and hid the dock on desktop. */
export function clearLegacyCatDockPositionKeys(): void {
  try {
    localStorage.removeItem(AI_CAT_STORAGE_X)
    localStorage.removeItem(AI_CAT_STORAGE_Y)
  } catch {
    /* ignore */
  }
}

function readCatHiddenFromStorage(): boolean {
  try {
    return localStorage.getItem(AI_CAT_HIDDEN_KEY) === 'true'
  } catch {
    return false
  }
}

function persistCatHidden(hidden: boolean): void {
  try {
    localStorage.setItem(AI_CAT_HIDDEN_KEY, hidden ? 'true' : 'false')
  } catch {
    /* ignore */
  }
}

/** Desktop/tablet floating dock: ~132px visible; mobile banner cluster stays compact. */
export function useAIAssistantCatDisplaySize(): number {
  const [px, setPx] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia(AI_ASSISTANT_MOBILE_MEDIA).matches ? 70 : 132,
  )

  useEffect(() => {
    const mq = window.matchMedia(AI_ASSISTANT_MOBILE_MEDIA)
    const sync = () => setPx(mq.matches ? 70 : 132)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  return px
}

export function useAIAssistantCatContextMenuEnabled(): boolean {
  const [enabled, setEnabled] = useState(() =>
    typeof window !== 'undefined' ? !window.matchMedia(AI_ASSISTANT_MOBILE_MEDIA).matches : true,
  )

  useEffect(() => {
    const mq = window.matchMedia(AI_ASSISTANT_MOBILE_MEDIA)
    const onChange = () => setEnabled(!mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return enabled
}

export function useAIAssistantPet() {
  const [catHidden, setCatHidden] = useState(readCatHiddenFromStorage)

  const hideCat = useCallback(() => {
    persistCatHidden(true)
    setCatHidden(true)
  }, [])

  const showCat = useCallback(() => {
    persistCatHidden(false)
    setCatHidden(false)
  }, [])

  return { catHidden, hideCat, showCat }
}
