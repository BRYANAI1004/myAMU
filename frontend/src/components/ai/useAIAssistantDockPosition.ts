import { useCallback, useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { AI_ASSISTANT_MOBILE_MEDIA } from './aiAssistantGeometry'

export const AI_CAT_STORAGE_X = 'amu-ai-cat-x'
export const AI_CAT_STORAGE_Y = 'amu-ai-cat-y'

const DRAG_THRESHOLD_PX = 8
const MIN_VISIBLE = 56

function readStoredPosition(): { left: number; top: number } | null {
  try {
    const xs = localStorage.getItem(AI_CAT_STORAGE_X)
    const ys = localStorage.getItem(AI_CAT_STORAGE_Y)
    if (xs == null || ys == null) return null
    const left = Number(xs)
    const top = Number(ys)
    if (!Number.isFinite(left) || !Number.isFinite(top)) return null
    return { left, top }
  } catch {
    return null
  }
}

function persistPosition(left: number, top: number): void {
  try {
    localStorage.setItem(AI_CAT_STORAGE_X, String(Math.round(left)))
    localStorage.setItem(AI_CAT_STORAGE_Y, String(Math.round(top)))
  } catch {
    /* ignore quota / private mode */
  }
}

function clampDock(left: number, top: number, width: number, height: number, vw: number, vh: number) {
  const minL = -width + MIN_VISIBLE
  const maxL = vw - MIN_VISIBLE
  const minT = -height + MIN_VISIBLE
  const maxT = vh - MIN_VISIBLE
  return {
    left: Math.min(maxL, Math.max(minL, left)),
    top: Math.min(maxT, Math.max(minT, top)),
  }
}

type DragSession = {
  pointerId: number
  startClientX: number
  startClientY: number
  originLeft: number
  originTop: number
  dragging: boolean
}

export function useAIAssistantDockPosition(
  dockRef: RefObject<HTMLDivElement | null>,
  dragEnabled: boolean,
  onCatActivate: () => void,
) {
  const [customPos, setCustomPos] = useState<{ left: number; top: number } | null>(() =>
    dragEnabled ? readStoredPosition() : null,
  )

  const dragRef = useRef<DragSession | null>(null)
  const latestPosRef = useRef<{ left: number; top: number } | null>(null)

  useEffect(() => {
    if (customPos) latestPosRef.current = customPos
  }, [customPos])

  useEffect(() => {
    if (!dragEnabled) {
      setCustomPos(null)
      return
    }
    const stored = readStoredPosition()
    setCustomPos(stored)
  }, [dragEnabled])

  const clampAndSet = useCallback(
    (left: number, top: number) => {
      const el = dockRef.current
      const vw = window.innerWidth
      const vh = window.innerHeight
      const w = el?.offsetWidth ?? 160
      const h = el?.offsetHeight ?? 72
      const next = clampDock(left, top, w, h, vw, vh)
      latestPosRef.current = next
      setCustomPos(next)
      return next
    },
    [dockRef],
  )

  useEffect(() => {
    if (!dragEnabled) return
    const onResize = () => {
      setCustomPos((prev) => {
        if (!prev) return prev
        return clampAndSet(prev.left, prev.top)
      })
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [dragEnabled, clampAndSet])

  const dockStyle =
    dragEnabled && customPos
      ? {
          left: customPos.left,
          top: customPos.top,
          right: 'auto' as const,
          bottom: 'auto' as const,
        }
      : undefined

  const onCatPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!dragEnabled) return
      if (e.button !== 0) return
      const el = dockRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const originLeft = customPos?.left ?? rect.left
      const originTop = customPos?.top ?? rect.top
      dragRef.current = {
        pointerId: e.pointerId,
        startClientX: e.clientX,
        startClientY: e.clientY,
        originLeft,
        originTop,
        dragging: false,
      }
      e.currentTarget.setPointerCapture(e.pointerId)
    },
    [dragEnabled, customPos, dockRef],
  )

  const onCatPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const d = dragRef.current
      if (!d || e.pointerId !== d.pointerId || !dragEnabled) return
      const dx = e.clientX - d.startClientX
      const dy = e.clientY - d.startClientY
      if (!d.dragging) {
        if (dx * dx + dy * dy < DRAG_THRESHOLD_PX * DRAG_THRESHOLD_PX) return
        d.dragging = true
      }
      clampAndSet(d.originLeft + dx, d.originTop + dy)
    },
    [dragEnabled, clampAndSet],
  )

  const onCatPointerUp = useCallback(
    (e: React.PointerEvent) => {
      const d = dragRef.current
      if (!d || e.pointerId !== d.pointerId || !dragEnabled) return
      const wasDragging = d.dragging
      dragRef.current = null
      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch {
        /* already released */
      }
      if (wasDragging) {
        const p = latestPosRef.current
        if (p) persistPosition(p.left, p.top)
      } else {
        onCatActivate()
      }
    },
    [dragEnabled, onCatActivate],
  )

  const onCatPointerCancel = useCallback((e: React.PointerEvent) => {
    dragRef.current = null
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* noop */
    }
  }, [])

  return {
    dockStyle,
    onCatPointerDown,
    onCatPointerMove,
    onCatPointerUp,
    onCatPointerCancel,
  }
}

export function useAIAssistantCatDragEnabled(): boolean {
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
