import { useMemo } from 'react'
import {
  fetchStudentLoginEmailStatus,
  sendStudentLoginEmailCode,
  verifyStudentLoginEmailCode,
} from '../lib/api'
import { LoginEmailPanel } from './LoginEmailPanel'

type Props = {
  ready: boolean
  embedded?: boolean
}

export function StudentLoginEmailPanel({ ready, embedded = false }: Props) {
  const api = useMemo(
    () => ({
      fetchStatus: fetchStudentLoginEmailStatus,
      sendCode: async (email: string) => {
        await sendStudentLoginEmailCode(email)
      },
      verifyCode: verifyStudentLoginEmailCode,
    }),
    [],
  )

  return (
    <LoginEmailPanel
      ready={ready}
      embedded={embedded}
      api={api}
      inputIdPrefix="login-email"
      intro="Verify an email to sign in with a one-time code or reset your password later. This is separate from your contact email above."
    />
  )
}
