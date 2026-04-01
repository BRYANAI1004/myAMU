import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { mahmAccountMock } from '../mock/mahmAccountMock'
import type { MahmAccountMock } from '../mock/mahmAccountMock'

const PORTAL_STUDENT_ID_KEY = 'portal_student_id'

function readStoredStudentId(): string | null {
  try {
    const raw = localStorage.getItem(PORTAL_STUDENT_ID_KEY)
    const trimmed = raw?.trim() ?? ''
    return trimmed.length > 0 ? trimmed : null
  } catch {
    return null
  }
}

type AccountContextValue = {
  account: MahmAccountMock
  loading: false
  error: null
  reload: () => void
  currentStudentId: string | null
  login: (studentId: string) => void
  logout: () => void
  isAuthenticated: boolean
}

const AccountContext = createContext<AccountContextValue | null>(null)

export function AccountProvider({ children }: { children: ReactNode }) {
  const [currentStudentId, setCurrentStudentId] = useState<string | null>(() =>
    readStoredStudentId(),
  )

  const login = useCallback((studentId: string) => {
    const trimmed = studentId.trim()
    setCurrentStudentId(trimmed)
    try {
      localStorage.setItem(PORTAL_STUDENT_ID_KEY, trimmed)
    } catch {
      /* ignore quota / private mode */
    }
  }, [])

  const logout = useCallback(() => {
    setCurrentStudentId(null)
    try {
      localStorage.removeItem(PORTAL_STUDENT_ID_KEY)
    } catch {
      /* ignore */
    }
  }, [])

  const reload = useCallback(() => {}, [])

  const value = useMemo<AccountContextValue>(
    () => ({
      account: mahmAccountMock,
      loading: false,
      error: null,
      reload,
      currentStudentId,
      login,
      logout,
      isAuthenticated:
        currentStudentId !== null && currentStudentId.trim().length > 0,
    }),
    [currentStudentId, login, logout, reload],
  )

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
}

export function useAccount() {
  const ctx = useContext(AccountContext)
  if (!ctx) {
    throw new Error('useAccount must be used within AccountProvider')
  }
  return ctx
}
