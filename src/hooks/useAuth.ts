import { useCallback, useEffect, useRef, useState } from "react"
import { apiFetch, clearToken, getToken, setToken, tokenExpiry, SESSION_ENDED } from "../api"

function validateToken(data: unknown): string {
  const token = data && typeof data === 'object' && 'access_token' in data ? data.access_token : null
  if (typeof token !== 'string' || (tokenExpiry(token) ?? 0) <= Date.now()) throw new Error('The server returned an invalid session.')
  return token
}

export default function useAuth() {
  const [authenticated, setAuthenticated] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [token, updateToken] = useState<string | null>(null)
  const [remaining, setRemaining] = useState<number | null>(null)
  const [renewing, setRenewing] = useState(false)
  const [renewError, setRenewError] = useState<string | null>(null)
  const deadline = useRef<number | null>(null)
  const renewal = useRef<AbortController | null>(null)
  const logout = useCallback(() => {
    renewal.current?.abort()
    clearToken()
    updateToken(null)
    setAuthenticated(false)
    setRemaining(null)
    setRenewing(false)
    setRenewError(null)
    deadline.current = null
  }, [])

  useEffect(() => {
    window.addEventListener(SESSION_ENDED, logout)
    return () => window.removeEventListener(SESSION_ENDED, logout)
  }, [logout])

  useEffect(() => {
    const controller = new AbortController()
    async function checkAuth() {
      const saved = getToken()
      if (!saved || (tokenExpiry(saved) ?? 0) <= Date.now()) {
        logout(); setCheckingAuth(false); return
      }
      try {
        const response = await apiFetch('/auth/me', { signal: controller.signal })
        if (!controller.signal.aborted && getToken() === saved) {
          if (response.ok) { updateToken(saved); setAuthenticated(true) } else logout()
        }
      } catch { if (!controller.signal.aborted) logout() }
      finally { if (!controller.signal.aborted) setCheckingAuth(false) }
    }
    void checkAuth()
    return () => controller.abort()
  }, [logout])

  useEffect(() => {
    if (!authenticated || !token) return
    const expires = tokenExpiry(token) ?? 0
    function tick() {
      const now = Date.now()
      if (now >= expires || (deadline.current !== null && now >= deadline.current)) { logout(); return }
      if (now >= expires - 60000 && deadline.current === null) deadline.current = Math.min(now + 30000, expires)
      if (deadline.current !== null) setRemaining(Math.max(0, Math.ceil((deadline.current - now) / 1000)))
    }
    tick()
    const timer = window.setInterval(tick, 500)
    window.addEventListener('focus', tick)
    document.addEventListener('visibilitychange', tick)
    return () => { clearInterval(timer); window.removeEventListener('focus', tick); document.removeEventListener('visibilitychange', tick) }
  }, [authenticated, token, logout])

  useEffect(() => () => renewal.current?.abort(), [])

  async function login(username: string, password: string): Promise<void> {
    const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) })
    if (!response.ok) throw new Error('Invalid username or password')
    const next = validateToken(await response.json())
    setToken(next); updateToken(next); deadline.current = null; setRemaining(null); setRenewError(null); setAuthenticated(true)
  }

  async function renew(): Promise<void> {
    if (renewal.current || !token) return
    if (!deadline.current || Date.now() >= deadline.current || Date.now() >= (tokenExpiry(token) ?? 0)) { logout(); return }
    const previous = token
    const controller = new AbortController()
    renewal.current = controller
    setRenewing(true); setRenewError(null)
    const timeout = window.setTimeout(() => controller.abort(), 10000)
    try {
      const response = await apiFetch('/auth/refresh', { method: 'POST', signal: controller.signal })
      if (!response.ok) throw new Error('Could not renew your session. Please retry or sign out.')
      const next = validateToken(await response.json())
      if (getToken() !== previous || controller.signal.aborted) return
      if (!deadline.current || Date.now() >= deadline.current) { logout(); return }
      setToken(next); updateToken(next); deadline.current = null; setRemaining(null)
    } catch (error) {
      if (getToken() === previous) setRenewError(error instanceof Error && error.name !== 'AbortError' ? error.message : 'Request timed out. Please retry.')
    } finally {
      clearTimeout(timeout)
      if (renewal.current === controller) { renewal.current = null; setRenewing(false) }
    }
  }
  return { authenticated, checkingAuth, login, logout, remaining, renewing, renewError, renew }
}
