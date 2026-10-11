import { useCallback, useEffect, useRef, useState } from "react"
import { apiFetch } from "../api"

type PollState<T> = { data: T | null; error: string | null; loading: boolean }
type ActiveRequest<T> = { controller: AbortController; promise: Promise<T> }

/** Serial polling with cancellation, request coalescing, and a bounded request time. */
export default function usePolling<T>(path: string, enabled: boolean, interval: number) {
  const [state, setState] = useState<PollState<T>>({ data: null, error: null, loading: true })
  const active = useRef<ActiveRequest<T> | null>(null)
  const mounted = useRef(false)
  const refresh = useCallback((): Promise<T> => {
    if (!enabled || !mounted.current) return Promise.reject(new Error("Telemetry is inactive"))
    if (active.current) return active.current.promise
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 12000)
    const promise = (async () => {
      try {
        const response = await apiFetch(path, { signal: controller.signal })
        if (!response.ok) throw new Error(`Request failed (${response.status})`)
        const data: T = await response.json()
        if (mounted.current && active.current?.controller === controller) setState({ data, error: null, loading: false })
        return data
      } catch (error) {
        if (mounted.current && active.current?.controller === controller) {
          setState(previous => ({ ...previous, loading: false, error: controller.signal.aborted ? "Request timed out" : error instanceof Error ? error.message : "Telemetry unavailable" }))
        }
        throw error
      } finally {
        window.clearTimeout(timeout)
        if (active.current?.controller === controller) active.current = null
      }
    })()
    active.current = { controller, promise }
    return promise
  }, [enabled, path])

  useEffect(() => {
    if (!enabled) return
    mounted.current = true
    let disposed = false
    let timer: ReturnType<typeof setTimeout> | undefined
    async function poll() {
      try { await refresh() } catch { /* Error is exposed through state. */ }
      if (!disposed) timer = setTimeout(() => void poll(), interval)
    }
    void poll()
    return () => {
      disposed = true
      mounted.current = false
      clearTimeout(timer)
      const request = active.current
      active.current = null
      request?.controller.abort()
    }
  }, [enabled, interval, refresh])
  return { ...state, refresh }
}
