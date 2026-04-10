import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAccount } from '../../context/AccountContext'
import { useStudentPortalT } from '../../LanguageContext'
import { portalTermLabel } from '../../lib/accountDisplay'
import { formatMoney } from '../../lib/formatMoney'

export function FinancesLateFeesPage() {
  const t = useStudentPortalT()
  const { account } = useAccount()
  const termLabel = portalTermLabel(account)
  const lateRows = account.lineItems.filter((row) => /late fee/i.test(row.description))
  const lede = useMemo(() => t('lateFeesLede').replace('{termLabel}', termLabel), [t, termLabel])

  return (
    <main className="portal-page">
      <p className="portal-page-lede">
        {lede}
      </p>

      {lateRows.length > 0 ? (
        <section className="portal-card portal-stack" aria-labelledby="late-fees-heading">
          <h2 id="late-fees-heading" className="portal-section-heading">
            {t('lateFeesOnRecord')}
          </h2>
          <div className="portal-table-wrap">
            <table className="portal-table portal-table--courses">
              <caption className="visually-hidden">{t('postedLateFeesCaption')}</caption>
              <thead>
                <tr>
                  <th scope="col">{t('description')}</th>
                  <th scope="col">{t('category')}</th>
                  <th scope="col">{t('amount')}</th>
                </tr>
              </thead>
              <tbody>
                {lateRows.map((row, index) => (
                  <tr key={`${index}-${row.description}`}>
                    <td>{row.description}</td>
                    <td className="portal-table-cell-capitalize">{row.category}</td>
                    <td>{formatMoney(row.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <section className="portal-card portal-stack" aria-labelledby="late-fees-heading">
          <h2 id="late-fees-heading" className="portal-section-heading">
            {t('lateFeesHeadingShort')}
          </h2>
          <p className="portal-inline-note portal-inline-note--flush">
            {t('noLateFeesThisTerm')}
          </p>
        </section>
      )}

      <p className="portal-inline-note">
        {t('lateFeesSeeAccountSummary')}{' '}
        <Link className="portal-text-link" to="/finances/overview">
          {t('accountSummary')}
        </Link>
        .
      </p>
    </main>
  )
}
