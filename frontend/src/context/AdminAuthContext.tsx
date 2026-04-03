import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

const ADMIN_SESSION_KEY = 'amu_admin_session'

type AdminAuthContextValue = {
  isAuthenticated: boolean
  login: () => void
  logout: () => void
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null)

function readSession(): boolean {
  try {
    return sessionStorage.getItem(ADMIN_SESSION_KEY) === '1'
  } catch {
    return false
  }
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(readSession)

  const login = useCallback(() => {
    try {
      sessionStorage.setItem(ADMIN_SESSION_KEY, '1')
    } catch {
      /* ignore */
    }
    setIsAuthenticated(true)
  }, [])

  const logout = useCallback(() => {
    try {
      sessionStorage.removeItem(ADMIN_SESSION_KEY)
    } catch {
      /* ignore */
    }
    setIsAuthenticated(false)
  }, [])

  const value = useMemo(
    () => ({ isAuthenticated, login, logout }),
    [isAuthenticated, login, logout],
  )

  return (
    <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>
  )
}

export function useAdminAuth(): AdminAuthContextValue {
  const ctx = useContext(AdminAuthContext)
  if (!ctx) {
    throw new Error('useAdminAuth must be used within AdminAuthProvider')
  }
  return ctx
}
