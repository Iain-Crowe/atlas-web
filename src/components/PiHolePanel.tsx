import { useEffect, useState } from "react"
import { apiFetch } from "../api"
import "./PiHolePanel.css"

type Reading<T> = { state: "ready" | "warming_up" | "unavailable"; updated_at: number | null; values: T | null }
type Summary = { queries: number; blocked: number; percent_blocked: number; active_clients: number; blocklist_domains: number; cached: number; forwarded: number }
type Blocking = { status: "enabled" | "disabled" | "unknown" | "failed"; timer_seconds: number | null }
type Snapshot = { summary: Reading<Summary>; blocking: Reading<Blocking> }
const labels: [keyof Summary, string][] = [
  ["queries", "DNS Queries"], ["blocked", "Blocked Queries"], ["percent_blocked", "Blocked Percentage"],
  ["active_clients", "Active Clients"], ["blocklist_domains", "Blocklist Domains"],
  ["cached", "Cached Queries"], ["forwarded", "Forwarded Queries"],
]
const states = { enabled: "Enabled", disabled: "Disabled", unknown: "Unknown", failed: "Failed" }

export default function PiHolePanel({ serviceId }: { serviceId: number }) {
  const [data, setData] = useState<Snapshot | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let disposed = false
    let timer: ReturnType<typeof setTimeout> | undefined
    let controller: AbortController | undefined
    async function load() {
      const requestController = new AbortController()
      controller = requestController
      const deadline = setTimeout(() => requestController.abort(), 12000)
      try {
        const response = await apiFetch(`/services/${serviceId}/pihole/status`, { signal: requestController.signal })
        if (!response.ok) throw new Error(`Pi-hole telemetry unavailable (${response.status})`)
        const snapshot: Snapshot = await response.json()
        if (!disposed) { setData(snapshot); setError(null) }
      } catch (reason) {
        if (!disposed) { setData(null); setError(reason instanceof Error ? reason.message : "Pi-hole telemetry unavailable") }
      } finally {
        clearTimeout(deadline)
        if (!disposed) timer = setTimeout(() => void load(), 30000)
      }
    }
    void load()
    return () => { disposed = true; controller?.abort(); clearTimeout(timer) }
  }, [serviceId])
  const summary = data?.summary.state === "ready" ? data.summary.values : null
  const blocking = data?.blocking.state === "ready" ? data.blocking.values : null
  return <section className="pihole-panel">
    <div className="pihole-heading"><h3>Pi-Hole Telemetry</h3>
      <a href="https://pihole.atlas.home.arpa/admin/" target="_blank" rel="noopener noreferrer">Open Pi-Hole Dashboard ↗</a>
    </div>
    {error && <p role="status">{error}</p>}
    {!data && !error && <p role="status">Loading Pi-hole telemetry…</p>}
    {data && !summary && <p role="status">{data.summary.state === "warming_up" ? "Waiting for the first statistics reading…" : "Pi-hole statistics are currently unavailable."}</p>}
    <div className="pihole-metrics">
      <div className="pihole-metric"><span>DNS Blocking</span><strong>{blocking ? states[blocking.status] : "Unavailable"}</strong>
        {blocking?.timer_seconds != null && <small>Scheduled Change In {Math.ceil(blocking.timer_seconds)} Seconds</small>}
      </div>
      {labels.map(([key, label]) => <div className="pihole-metric" key={key}><span>{label}</span>
        <strong>{summary ? key === "percent_blocked" ? `${summary[key].toFixed(1)}%` : summary[key].toLocaleString() : "—"}</strong>
      </div>)}
    </div>
    <p className="history-muted">Statistics reflect Pi-hole’s current reporting window. Active clients are clients seen in that window, not necessarily connected now. Blocklist Domains is the gravity-list count.</p>
    <p className="history-muted">Statistics: {data?.summary.updated_at ? new Date(data.summary.updated_at * 1000).toLocaleString() : "No Current Reading"}<br />
      Blocking: {data?.blocking.updated_at ? new Date(data.blocking.updated_at * 1000).toLocaleString() : "No Current Reading"}<br />
      Refreshes every 30 seconds. Atlas stores no Pi-hole history.</p>
  </section>
}
