import { useEffect, useState } from 'react'
import { useStudentPortalT } from '@/LanguageContext'

/** Slim, non-blocking notice when the device goes offline (app shell may still render). */
export function OfflineRibbon() {
  const t = useStudentPortalT()
  const [offline, setOffline] = useState(
    () => typeof navigator !== 'undefined' && navigator.onLine === false,
  )

  useEffect(() => {
    const onOff = () => setOffline(true)
    const onOn = () => setOffline(false)
    window.addEventListener('offline', onOff)
    window.addEventListener('online', onOn)
    return () => {
      window.removeEventListener('offline', onOff)
      window.removeEventListener('online', onOn)
    }
  }, [])

  if (!offline) return null

  return (
    <div className="portal-offline-ribbon" role="status">
      {t('offlineRibbonMessage')}
    </div>
  )
}
