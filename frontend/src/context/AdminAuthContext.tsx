import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { type AdminRole, isAdminRole } from '../lib/adminAccess'

const ADMIN_SESSION_KEY = 'amu_admin_session'

type AdminAccount = {
  email: string
  password: string
  role: AdminRole
  loginIds?: readonly string[]
}

type AdminLoginResult =
  | { ok: true }
  | { ok: false; error: string }

type StoredAdminSession = {
  email: string
  role: AdminRole
}

type AdminAuthContextValue = {
  isAuthenticated: boolean
  role: AdminRole | null
  login: (email: string, password: string) => AdminLoginResult
  logout: () => void
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null)

const ADMIN_ACCOUNTS: readonly AdminAccount[] = [
  {
    email: 'deanjiang@amu',
    password: 'deanjiang123',
    role: 'super_admin',
    loginIds: ['deanjiang'],
  },
  {
    email: 'wanpanelami@gmail.com',
    password: 'amuadmin123',
    role: 'admin',
  },
  {
    email: 'bingchen.li@wanpanel.ai',
    password: 'amuadmin123',
    role: 'admin',
  },
  {
    email: 'clinic@amu.edu',
    password: 'amuadmin123',
    role: 'admin',
  },
  {
    email: 'clinicdean@amu.edu',
    password: 'amuadmin123',
    role: 'admin',
  },
  {
    email: 'teacher@amu.edu',
    password: 'teacher123',
    role: 'teacher',
  },
  {
    email: 'clinical@amu.edu',
    password: 'clinical123',
    role: 'clinical_teacher',
  },
  {
    email: 'clinicaladmin@amu',
    password: 'clinicaladmin',
    role: 'clinical_admin',
    loginIds: ['clinicaladmin'],
  },
] as const

function normalizeLoginId(value: string): string {
  return value.trim().toLowerCase()
}

const ADMIN_ACCOUNT_MAP = new Map<string, AdminAccount>()
for (const account of ADMIN_ACCOUNTS) {
  const ids = [account.email, ...(account.loginIds ?? [])]
  for (const id of ids) {
    const normalized = normalizeLoginId(id)
    if (normalized) {
      ADMIN_ACCOUNT_MAP.set(normalized, account)
    }
  }
}

function readSession(): StoredAdminSession | null {
  try {
    const raw = sessionStorage.getItem(ADMIN_SESSION_KEY)
    if (raw === '1') {
      return {
        email: '',
        role: 'admin',
      }
    }
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<StoredAdminSession>
    if (typeof parsed.role === 'string' && isAdminRole(parsed.role)) {
      return {
        email: typeof parsed.email === 'string' ? parsed.email : '',
        role: parsed.role,
      }
    }
    return null
  } catch {
    return null
  }
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<StoredAdminSession | null>(readSession)
  const isAuthenticated = session !== null

  const login = useCallback((email: string, password: string): AdminLoginResult => {
    const normalizedLoginId = normalizeLoginId(email)
    if (!normalizedLoginId) {
      return { ok: false, error: 'Username or Email is required' }
    }
    if (password === '') {
      return { ok: false, error: 'Password is required' }
    }
    const normalizedPassword = password.trim()
    const account = ADMIN_ACCOUNT_MAP.get(normalizedLoginId)
    if (!account) {
      return { ok: false, error: 'Invalid email or password.' }
    }
    if (password !== account.password && normalizedPassword !== account.password) {
      return { ok: false, error: 'Invalid email or password.' }
    }
    const nextSession: StoredAdminSession = {
      email: account.email,
      role: account.role,
    }
    try {
      sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(nextSession))
    } catch {
      /* ignore */
    }
    setSession(nextSession)
    return { ok: true }
  }, [])

  const logout = useCallback(() => {
    try {
      sessionStorage.removeItem(ADMIN_SESSION_KEY)
    } catch {
      /* ignore */
    }
    setSession(null)
  }, [])

  const value = useMemo(
    () => ({ isAuthenticated, role: session?.role ?? null, login, logout }),
    [isAuthenticated, login, logout, session?.role],
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
