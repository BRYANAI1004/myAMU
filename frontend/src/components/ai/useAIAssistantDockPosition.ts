import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { AI_ASSISTANT_MOBILE_MEDIA } from './aiAssistantGeometry'
import {
  clearLegacyCatDockPositionKeys,
  persistDockOffset,
  readStoredDockOffset,
} from './useAIAssistantPet'

export { AI_CAT_STORAGE_X, AI_CAT_STORAGE_Y, AI_DOCK_OFFSET_X, AI_DOCK_OFFSET_Y } from './useAIAssistantPet'

const DRAG_THRESHOLD_PX = 8
const MIN_VISIBLE = 56

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
  originDx: number
  originDy: number
  baseLeft: number
  baseTop: number
  dragging: boolean
}

function initialDockOffset(): { dx: number; dy: number } {
  if (typeof window === 'undefined') return { dx: 0, dy: 0 }
  const mobile = window.matchMedia(AI_ASSISTANT_MOBILE_MEDIA).matches
  if (mobile) return { dx: 0, dy: 0 }
  clearLegacyCatDockPositionKeys()
  return readStoredDockOffset() ?? { dx: 0, dy: 0 }
}

export function useAIAssistantDockPosition(
  dockRef: RefObject<HTMLDivElement | null>,
  dragEnabled: boolean,
  onActivate: () => void,
) {
  const [dockOffset, setDockOffset] = useState(initialDockOffset)
  const latestOffsetRef = useRef(dockOffset)
  const dragRef = useRef<DragSession | null>(null)

  useEffect(() => {
    latestOffsetRef.current = dockOffset
  }, [dockOffset])

  useEffect(() => {
    if (!dragEnabled) {
      setDockOffset({ dx: 0, dy: 0 })
      return
    }
    clearLegacyCatDockPositionKeys()
    setDockOffset(readStoredDockOffset() ?? { dx: 0, dy: 0 })
  }, [dragEnabled])

  const clampOffset = useCallback(
    (nextDx: number, nextDy: number, session?: Pick<DragSession, 'baseLeft' | 'baseTop'>) => {
      const el = dockRef.current
      const vw = window.innerWidth
      const vh = window.innerHeight
      if (!el) {
        latestOffsetRef.current = { dx: nextDx, dy: nextDy }
        return { dx: nextDx, dy: nextDy }
      }
      const w = el.offsetWidth || 160
      const h = el.offsetHeight || 72
      const rect = el.getBoundingClientRect()
      const cur = latestOffsetRef.current
      const baseLeft = session?.baseLeft ?? rect.left - cur.dx
      const baseTop = session?.baseTop ?? rect.top - cur.dy
      const wantLeft = baseLeft + nextDx
      const wantTop = baseTop + nextDy
      const c = clampDock(wantLeft, wantTop, w, h, vw, vh)
      const next = { dx: c.left - baseLeft, dy: c.top - baseTop }
      latestOffsetRef.current = next
      return next
    },
    [dockRef],
  )

  useLayoutEffect(() => {
    if (!dragEnabled) return
    setDockOffset((prev) => clampOffset(prev.dx, prev.dy))
  }, [dragEnabled, clampOffset])

  useEffect(() => {
    if (!dragEnabled) return
    const onResize = () => {
      setDockOffset((prev) => clampOffset(prev.dx, prev.dy))
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [dragEnabled, clampOffset])

  const dockStyle = useMemo(() => {
    if (!dockOffset.dx && !dockOffset.dy) return undefined
    return { transform: `translate3d(${dockOffset.dx}px, ${dockOffset.dy}px, 0)` }
  }, [dockOffset.dx, dockOffset.dy])

  const onDockPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!dragEnabled) return
      if (e.button !== 0) return
      const el = dockRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const o = latestOffsetRef.current
      const baseLeft = rect.left - o.dx
      const baseTop = rect.top - o.dy
      dragRef.current = {
        pointerId: e.pointerId,
        startClientX: e.clientX,
        startClientY: e.clientY,
        originDx: o.dx,
        originDy: o.dy,
        baseLeft,
        baseTop,
        dragging: false,
      }
      e.currentTarget.setPointerCapture(e.pointerId)
    },
    [dragEnabled, dockRef],
  )

  const onDockPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const d = dragRef.current
      if (!d || e.pointerId !== d.pointerId || !dragEnabled) return
      const dx = e.clientX - d.startClientX
      const dy = e.clientY - d.startClientY
      if (!d.dragging) {
        if (dx * dx + dy * dy < DRAG_THRESHOLD_PX * DRAG_THRESHOLD_PX) return
        d.dragging = true
      }
      const nextDx = d.originDx + dx
      const nextDy = d.originDy + dy
      const clamped = clampOffset(nextDx, nextDy, { baseLeft: d.baseLeft, baseTop: d.baseTop })
      setDockOffset(clamped)
    },
    [dragEnabled, clampOffset],
  )

  const onDockPointerUp = useCallback(
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
        const p = latestOffsetRef.current
        persistDockOffset(p.dx, p.dy)
      } else {
        onActivate()
      }
    },
    [dragEnabled, onActivate],
  )

  const onDockPointerCancel = useCallback((e: React.PointerEvent) => {
    dragRef.current = null
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* noop */
    }
  }, [])

  return {
    dockStyle,
    onDockPointerDown,
    onDockPointerMove,
    onDockPointerUp,
    onDockPointerCancel,
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
