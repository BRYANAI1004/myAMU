import { io, type Socket } from 'socket.io-client'
import { API_BASE } from './api'

type EnrollmentChangedAction = 'registered' | 'dropped'

export type EnrollmentChangedEvent = {
  type: 'enrollment.changed'
  studentId: string
  sectionId: number | null
  action: EnrollmentChangedAction
  occurredAt: string
}

const STUDENT_AUTH_STORAGE_KEYS = [
  'portal_student_auth_token',
  'studentToken',
  'token',
] as const

function readStudentAccessTokenFromStorage(): string | null {
  try {
    for (const key of STUDENT_AUTH_STORAGE_KEYS) {
      const raw = localStorage.getItem(key)
      const trimmed = raw?.trim() ?? ''
      if (trimmed !== '') return trimmed
    }
  } catch {
    // Ignore localStorage access errors.
  }
  return null
}

export const socket: Socket = io(API_BASE, {
  autoConnect: false,
  withCredentials: true,
  transports: ['websocket', 'polling'],
  auth: (cb) => {
    const token = readStudentAccessTokenFromStorage()
    cb({
      ...(token ? { token } : {}),
    })
  },
})
