import { useMemo } from 'react'
import { INSTITUTION_NAME } from '../../branding'
import { useAccount } from '../../context/AccountContext'
import { useLanguage, useStudentPortalT } from '../../LanguageContext'
import { portalTermLabel } from '../../lib/accountDisplay'
import { formatMoney } from '../../lib/formatMoney'

function formatStatementDate(iso: string, locale: string) {
  const d = new Date(iso + 'T12:00:00')
  if (Number.isNaN(d.getTime())) return iso
  const loc = locale === 'zh' ? 'zh-Hant' : 'en-US'
  return d.toLocaleDateString(loc, { month: 'short', day: 'numeric', year: 'numeric' })
}

/** Statements listing shared by Finances statements route and legacy `/statements`. */
export function StatementsContent() {
  const { locale } = useLanguage()
  const t = useStudentPortalT()
  const { account } = useAccount()
  const termLabel = portalTermLabel(account)
  const lede = useMemo(
    () =>
      t('statementsLede')
        .replace('{institution}', INSTITUTION_NAME)
        .replace('{termLabel}', termLabel),
    [t, termLabel],
  )

  return (
    <>
      <p className="portal-page-lede">
        {lede}
      </p>

      <div className="portal-table-wrap">
        <table className="portal-table portal-table--statements">
          <caption className="visually-hidden">{t('recentBillingStatementsCaption')}</caption>
          <thead>
            <tr>
              <th scope="col">{t('statementDate')}</th>
              <th scope="col">{t('description')}</th>
              <th scope="col">{t('balance')}</th>
              <th scope="col">{t('term')}</th>
              <th scope="col">{t('view')}</th>
              <th scope="col">{t('download')}</th>
            </tr>
          </thead>
          <tbody>
            {account.statements.map((stmt) => (
              <tr key={`${stmt.statementDate}-${stmt.description}`}>
                <td>{formatStatementDate(stmt.statementDate, locale)}</td>
                <td>{stmt.description}</td>
                <td>{formatMoney(stmt.balance)}</td>
                <td>{termLabel}</td>
                <td>
                  <button type="button" className="portal-btn portal-btn--secondary portal-btn--compact">
                    {t('view')}
                  </button>
                </td>
                <td>
                  <button type="button" className="portal-btn portal-btn--secondary portal-btn--compact">
                    {t('download')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="portal-inline-note">
        {t('statementsFootnote')}
      </p>
    </>
  )
}
