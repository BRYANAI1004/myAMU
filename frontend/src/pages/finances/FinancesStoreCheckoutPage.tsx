import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useStudentPortalT } from '@/LanguageContext'
import { fetchAccountingQuarters } from '@/lib/api'
import { useAccount } from '@/context/AccountContext'

/** Legacy route — store checkout now flows through AMUbill overview. */
export function FinancesStoreCheckoutPage() {
  const t = useStudentPortalT()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { currentStudentId, isAuthenticated } = useAccount()
  const studentId = currentStudentId?.trim() ?? ''

  useEffect(() => {
    if (!isAuthenticated || studentId === '') {
      navigate('/finances/overview', { replace: true })
      return
    }

    const termFromQuery = searchParams.get('term')?.trim() ?? ''
    const yearFromQuery = Number(searchParams.get('year') ?? NaN)

    if (termFromQuery !== '' && Number.isFinite(yearFromQuery)) {
      const params = new URLSearchParams()
      params.set('term', termFromQuery)
      params.set('year', String(yearFromQuery))
      const label = searchParams.get('label')?.trim() ?? ''
      if (label !== '') params.set('label', label)
      navigate(`/finances/overview?${params.toString()}`, {
        replace: true,
        state: { financePaymentRefresh: true },
      })
      return
    }

    void fetchAccountingQuarters(studentId)
      .then((res) => {
        const newest = res.quarters[0]
        if (newest == null) {
          navigate('/finances/overview', { replace: true })
          return
        }
        const params = new URLSearchParams()
        params.set('term', newest.term)
        params.set('year', String(newest.year))
        if (newest.label.trim() !== '') params.set('label', newest.label)
        navigate(`/finances/overview?${params.toString()}`, {
          replace: true,
          state: { financePaymentRefresh: true },
        })
      })
      .catch(() => {
        navigate('/finances/overview', { replace: true })
      })
  }, [isAuthenticated, navigate, searchParams, studentId])

  return (
    <main className="portal-page">
      <p className="portal-inline-note portal-inline-note--flush" role="status">
        {t('loadingPaymentDetails')}
      </p>
    </main>
  )
}
