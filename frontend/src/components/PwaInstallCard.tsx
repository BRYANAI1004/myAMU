import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useStudentPortalT } from '@/LanguageContext'

const IOS_DISMISS_KEY = 'amu-pwa-ios-install-dismissed-at'
const IOS_COOLDOWN_MS = 21 * 24 * 60 * 60 * 1000

type ChromiumInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function readIosDismissed(): boolean {
  try {
    const raw = localStorage.getItem(IOS_DISMISS_KEY)
    if (!raw) return false
    const t = Number(raw)
    if (!Number.isFinite(t)) return false
    return Date.now() - t < IOS_COOLDOWN_MS
  } catch {
    return false
  }
}

function writeIosDismissed() {
  try {
    localStorage.setItem(IOS_DISMISS_KEY, String(Date.now()))
  } catch {
    /* ignore quota / private mode */
  }
}

function isIosLike(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  const touch =
    'maxTouchPoints' in navigator ? Number((navigator as Navigator & { maxTouchPoints?: number }).maxTouchPoints) || 0 : 0
  return /iPad|iPhone|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && touch > 1)
}

function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false
  if (window.matchMedia('(display-mode: standalone)').matches) return true
  const nav = window.navigator as Navigator & { standalone?: boolean }
  return nav.standalone === true
}

/**
 * Dashboard-only install affordance: Android/Chrome `beforeinstallprompt` button, or a
 * dismissible iPhone “Add to Home Screen” hint. Stays out of the bottom-right AI dock.
 */
export function PwaInstallCard() {
  const t = useStudentPortalT()
  const deferredRef = useRef<ChromiumInstallPromptEvent | null>(null)
  const [deferredReady, setDeferredReady] = useState(false)
  const [installed, setInstalled] = useState(false)
  const [iosDismissed, setIosDismissed] = useState(readIosDismissed)
  const [working, setWorking] = useState(false)

  const standalone = useMemo(() => isStandaloneDisplay(), [])

  useEffect(() => {
    const onBip = (e: Event) => {
      e.preventDefault()
      deferredRef.current = e as ChromiumInstallPromptEvent
      setDeferredReady(true)
    }
    const onInstalled = () => {
      setInstalled(true)
      deferredRef.current = null
      setDeferredReady(false)
    }
    window.addEventListener('beforeinstallprompt', onBip)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBip)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const onInstallClick = useCallback(async () => {
    const ev = deferredRef.current
    if (!ev || working) return
    setWorking(true)
    try {
      await ev.prompt()
      await ev.userChoice
    } catch {
      /* user dismissed or prompt unsupported */
    } finally {
      deferredRef.current = null
      setDeferredReady(false)
      setWorking(false)
    }
  }, [working])

  const onDismissIos = useCallback(() => {
    writeIosDismissed()
    setIosDismissed(true)
  }, [])

  if (standalone || installed) return null

  if (deferredReady) {
    return (
      <div className="portal-pwa-install portal-pwa-install--android">
        <p className="portal-pwa-install__lede">{t('pwaInstallAndroidLede')}</p>
        <button
          type="button"
          className="portal-btn portal-btn--primary portal-pwa-install__btn"
          onClick={() => void onInstallClick()}
          disabled={working}
        >
          {t('pwaInstallInstallMyAmu')}
        </button>
      </div>
    )
  }

  if (isIosLike() && !iosDismissed) {
    return (
      <div className="portal-pwa-install portal-pwa-install--ios">
        <p className="portal-pwa-install__text">{t('pwaInstallIosHint')}</p>
        <button type="button" className="portal-pwa-install__dismiss" onClick={onDismissIos}>
          {t('pwaInstallDismiss')}
        </button>
      </div>
    )
  }

  return null
}
