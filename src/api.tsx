const TOKEN_KEY = "atlas_access_token"
export const SESSION_ENDED = "atlas:session-ended"
export function getToken(): string | null { return sessionStorage.getItem(TOKEN_KEY) }
export function setToken(token: string): void { sessionStorage.setItem(TOKEN_KEY, token) }
export function clearToken(): void { sessionStorage.removeItem(TOKEN_KEY) }

export function tokenExpiry(token: string): number | null {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const { exp } = JSON.parse(atob(payload))
    return typeof exp === 'number' && Number.isFinite(exp) ? exp * 1000 : null
  } catch { return null }
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken()
  const headers = new Headers(options.headers)
  if (token) headers.set("Authorization", `Bearer ${token}`)
  const response = await fetch(`/api${path}`, { ...options, headers })
  // A late response from an older session must not end a renewed session.
  if (response.status === 401 && token && getToken() === token) {
    clearToken()
    window.dispatchEvent(new Event(SESSION_ENDED))
  }
  return response
}
