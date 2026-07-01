import { useMemo } from 'react'
import {
  fetchAdminLoginEmailStatus,
  sendAdminLoginEmailCode,
  verifyAdminLoginEmailCode,
} from '../../lib/api'
import { LoginEmailPanel } from '../LoginEmailPanel'

type Props = {
  ready: boolean
}

export function AdminLoginEmailPanel({ ready }: Props) {
  const api = useMemo(
    () => ({
      fetchStatus: fetchAdminLoginEmailStatus,
      sendCode: async (email: string) => {
        await sendAdminLoginEmailCode(email)
      },
      verifyCode: verifyAdminLoginEmailCode,
    }),
    [],
  )

  return (
    <LoginEmailPanel
      ready={ready}
      embedded
      api={api}
      inputIdPrefix="admin-login-email"
      intro="Verify an email to sign in with a one-time code or reset your password later."
    />
  )
}
