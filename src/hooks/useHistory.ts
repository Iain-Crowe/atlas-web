import { useEffect, useState } from "react"
import { apiFetch } from "../api"
import type { HistoryRange, TelemetryHistory } from "../types"

type Result = { key: string; data: TelemetryHistory | null; error: string | null; loading: boolean }

export default function useHistory(path: string, range: HistoryRange) {
  const key = `${path}?range=${range}`
  const [result, setResult] = useState<Result>({ key: "", data: null, error: null, loading: true })
  useEffect(() => {
    let disposed = false
    let timer: ReturnType<typeof setTimeout> | undefined
    let controller: AbortController | undefined
    async function load() {
      controller = new AbortController()
      const timeout = setTimeout(() => controller?.abort(), 12000)
      try {
        const response = await apiFetch(key, { signal: controller.signal })
        if (!response.ok) throw new Error(`History unavailable (${response.status})`)
        const data: TelemetryHistory = await response.json()
        if (!disposed) setResult({ key, data, error: null, loading: false })
      } catch (error) {
        if (!disposed) setResult(previous => ({
          key, data: previous.key === key ? previous.data : null, loading: false,
          error: error instanceof Error ? error.message : "History unavailable",
        }))
      } finally {
        clearTimeout(timeout)
        if (!disposed) timer = setTimeout(() => void load(), 15000)
      }
    }
    void load()
    return () => { disposed = true; controller?.abort(); clearTimeout(timer) }
  }, [key])
  return result.key === key ? result : { key, data: null, error: null, loading: true }
}
