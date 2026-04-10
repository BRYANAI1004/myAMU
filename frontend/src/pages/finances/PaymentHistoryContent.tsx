import { useMemo } from 'react'
import { INSTITUTION_NAME } from '../../branding'
import { useAccount } from '../../context/AccountContext'
import { useStudentPortalT } from '../../LanguageContext'
import { activityRowsFromRecent } from '../../lib/accountDisplay'
import { formatMoney } from '../../lib/formatMoney'

/** Recent activity table shared by Finances history and legacy `/activity`. */
export function PaymentHistoryContent() {
  const t = useStudentPortalT()
  const { account } = useAccount()
  const rows = activityRowsFromRecent(account.recentActivity)
  const lede = useMemo(
    () => t('paymentHistoryLede').replace('{institution}', INSTITUTION_NAME),
    [t],
  )

  return (
    <>
      <p className="portal-page-lede">
        {lede}
      </p>

      <div className="portal-table-wrap">
        <table className="portal-table portal-table--activity">
          <caption className="visually-hidden">{t('recentTuitionActivityCaption')}</caption>
          <thead>
            <tr>
              <th scope="col">{t('date')}</th>
              <th scope="col">{t('description')}</th>
              <th scope="col">{t('tableCharges')}</th>
              <th scope="col">{t('tableCredits')}</th>
              <th scope="col">{t('balance')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={`${i}-${row.date}-${row.description}`}>
                <td>{row.date}</td>
                <td>{row.description}</td>
                <td>{row.charges ? formatMoney(row.charges) : t('dashEm')}</td>
                <td>{row.credits ? formatMoney(row.credits) : t('dashEm')}</td>
                <td>{formatMoney(row.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
