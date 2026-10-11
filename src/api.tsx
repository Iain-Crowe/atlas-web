const TOKEN_KEY = "atlas_access_token"

export function getToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  sessionStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  sessionStorage.removeItem(TOKEN_KEY)
}

export async function apiFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const token = getToken()

  const headers = new Headers(options.headers)

  if (token) {
    headers.set("Authorization", `Bearer ${token}`)
  }

  const response = await fetch(`/api${path}`, {
    ...options,
    headers,
  })

  if (response.status === 401) {
    clearToken()
  }

  return response
}