import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useStudentPortalT } from '@/LanguageContext'
import { fetchAccountingQuarters } from '@/lib/api'
import { useAccount } from '@/context/AccountContext'
import { useStudentPortalTerm } from '@/context/StudentPortalTermContext'

/** Legacy route — store checkout now flows through AMUbill overview. */
export function FinancesStoreCheckoutPage() {
  const t = useStudentPortalT()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { currentStudentId, isAuthenticated } = useAccount()
  const { resolveAccountingQuarter, loading: portalTermLoading } =
    useStudentPortalTerm()
  const studentId = currentStudentId?.trim() ?? ''

  useEffect(() => {
    if (!isAuthenticated || studentId === '') {
      navigate('/finances/overview', { replace: true })
      return
    }
    if (portalTermLoading) return

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
        const defaultQuarter =
          resolveAccountingQuarter(res.quarters) ?? res.quarters[0]
        if (defaultQuarter == null) {
          navigate('/finances/overview', { replace: true })
          return
        }
        const params = new URLSearchParams()
        params.set('term', defaultQuarter.term)
        params.set('year', String(defaultQuarter.year))
        if (defaultQuarter.label.trim() !== '') params.set('label', defaultQuarter.label)
        navigate(`/finances/overview?${params.toString()}`, {
          replace: true,
          state: { financePaymentRefresh: true },
        })
      })
      .catch(() => {
        navigate('/finances/overview', { replace: true })
      })
  }, [
    isAuthenticated,
    navigate,
    searchParams,
    studentId,
    portalTermLoading,
    resolveAccountingQuarter,
  ])

  return (
    <main className="portal-page">
      <p className="portal-inline-note portal-inline-note--flush" role="status">
        {t('loadingPaymentDetails')}
      </p>
    </main>
  )
}
