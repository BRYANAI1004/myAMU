import { fetchApiJson } from './api'

const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
])

function mimeFromExtension(ext: string): string | null {
  switch (ext.toLowerCase()) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg'
    case '.png':
      return 'image/png'
    case '.webp':
      return 'image/webp'
    case '.gif':
      return 'image/gif'
    default:
      return null
  }
}

export class InvalidStudentAvatarFileError extends Error {
  override readonly name = 'InvalidStudentAvatarFileError'
  constructor() {
    super('Invalid student avatar file type')
  }
}

/** MIME type accepted by the backend presign endpoint. */
export function resolveAvatarContentType(file: File): string {
  const raw = file.type.trim().toLowerCase()
  if (ALLOWED_TYPES.has(raw)) return raw
  const dot = file.name.lastIndexOf('.')
  const ext = dot >= 0 ? file.name.slice(dot) : ''
  const fromExt = mimeFromExtension(ext)
  if (fromExt) return fromExt
  throw new InvalidStudentAvatarFileError()
}

type PresignJson = {
  imageId?: unknown
  uploadURL?: unknown
  contentType?: unknown
  /** Present when the API has `R2_PUBLIC_BASE_URL` — same public URL as after save. */
  publicUrl?: unknown
}

type SaveAvatarJson = {
  imageId?: unknown
  avatarUrl?: unknown
}

/**
 * Full student flow: presign → PUT bytes to R2 → persist key via API.
 * `uploadURL` is cross-origin (R2); not sent through `api()` base.
 */
export async function uploadStudentAvatarToR2(
  accessToken: string,
  file: File,
  init?: { signal?: AbortSignal },
): Promise<{ imageId: string; avatarUrl: string | null }> {
  const token = accessToken.trim()
  if (token === '') {
    throw new Error('Missing access token')
  }
  const contentType = resolveAvatarContentType(file)

  const presign = (await fetchApiJson('/api/uploads/student-avatar-url', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fileName: file.name,
      contentType,
    }),
    signal: init?.signal,
  })) as PresignJson

  const uploadURL = String(presign.uploadURL ?? '')
  const imageId = String(presign.imageId ?? '')
  const signedContentType = String(presign.contentType ?? contentType)
  if (!uploadURL || !imageId) {
    throw new Error('Invalid presign response from server')
  }

  const putRes = await fetch(uploadURL, {
    method: 'PUT',
    headers: { 'Content-Type': signedContentType },
    body: file,
    signal: init?.signal,
  })
  if (!putRes.ok) {
    const snippet = (await putRes.text().catch(() => '')).slice(0, 240)
    throw new Error(
      `Storage upload failed (HTTP ${putRes.status})${snippet ? `: ${snippet}` : ''}`,
    )
  }

  const saved = (await fetchApiJson('/api/student/avatar', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ imageId }),
    signal: init?.signal,
  })) as SaveAvatarJson

  const fromSave =
    typeof saved.avatarUrl === 'string' && saved.avatarUrl.trim() !== ''
      ? saved.avatarUrl.trim()
      : null
  const fromPresign =
    typeof presign.publicUrl === 'string' && presign.publicUrl.trim() !== ''
      ? presign.publicUrl.trim()
      : null
  const avatarUrl = fromSave ?? fromPresign

  return { imageId, avatarUrl }
}

export type StudentAvatarUploadUiResult =
  | { ok: true; avatarUrl: string | null }
  | { ok: false; reason: 'no_auth' | 'invalid_type' | 'other'; message?: string }

export async function tryUploadStudentAvatar(
  accessToken: string | null | undefined,
  file: File,
  signal?: AbortSignal,
): Promise<StudentAvatarUploadUiResult> {
  const token = accessToken?.trim() ?? ''
  if (token === '') {
    return { ok: false, reason: 'no_auth' }
  }
  try {
    const out = await uploadStudentAvatarToR2(token, file, { signal })
    return { ok: true, avatarUrl: out.avatarUrl }
  } catch (e) {
    if (e instanceof InvalidStudentAvatarFileError) {
      return { ok: false, reason: 'invalid_type' }
    }
    return {
      ok: false,
      reason: 'other',
      message: e instanceof Error ? e.message : 'Upload failed',
    }
  }
}
