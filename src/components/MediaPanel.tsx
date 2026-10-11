import { useEffect, useState } from "react"
import "./MediaPanel.css"
import { apiFetch } from "../api"

type Reading<T> = { state: string; updated_at: number | null; values: T | null }
type Health = { warnings: number; errors: number }
type Pipeline = Health & { queue_items: number; awaiting_import: number; queue_warnings: number; queue_errors: number; missing: number }
type Downloads = { downloading: number; seeding: number; queued: number; stalled: number; errors: number; stopped: number; other: number; download_bps: number; upload_bps: number }
type Snapshot = {
  containers: Reading<Record<string, { state: string; health: string }>>
  sonarr: Reading<Pipeline>; radarr: Reading<Pipeline>; prowlarr: Reading<Health>
  seerr: Reading<{ pending: number }>; downloads: Reading<Downloads>
}
const messages: Record<string, string> = { warming_up: "Waiting For First Reading", unavailable: "Unavailable", not_configured: "Credentials Need Setup", unauthorized: "Authentication Needs Attention", timeout: "Timed Out", limit: "Collection Limit Reached", invalid_response: "Unexpected API Response", changing: "Queue Changed During Reading", stopped: "Service Stopped" }
const names: Record<string, string> = { sonarr: "Sonarr", radarr: "Radarr", prowlarr: "Prowlarr", seerr: "Seerr", qbittorrent: "qBittorrent", gluetun: "Gluetun", flaresolverr: "FlareSolverr" }
const value = <T,>(reading: Reading<T> | undefined): T | null => reading?.state === "ready" ? reading.values : null
const fmt = (n: number | null | undefined) => n == null ? "—" : n.toLocaleString()
const rate = (n: number | undefined) => n == null ? "—" : `${(n * 8 / 1e6).toFixed(2)} Mbps`
const sum = (a: number | undefined, b: number | undefined) => a == null || b == null ? null : a + b

export default function MediaPanel() {
  const [data, setData] = useState<Snapshot | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let disposed = false
    let timer: ReturnType<typeof setTimeout> | undefined
    let controller: AbortController | undefined
    async function load() {
      const current = new AbortController(); controller = current
      const deadline = setTimeout(() => current.abort(), 12000)
      try {
        const response = await apiFetch('/media/status', { signal: current.signal })
        if (!response.ok) throw new Error(`Media telemetry unavailable (${response.status})`)
        const snapshot: Snapshot = await response.json()
        if (!disposed) { setData(snapshot); setError(null) }
      } catch (reason) {
        if (!disposed) { setData(null); setError(reason instanceof Error ? reason.message : "Media telemetry unavailable") }
      } finally {
        clearTimeout(deadline)
        if (!disposed) timer = setTimeout(() => void load(), 30000)
      }
    }
    void load()
    return () => { disposed = true; controller?.abort(); clearTimeout(timer) }
  }, [])
  const containers = value(data?.containers)
  const download = value(data?.downloads)
  const tv = value(data?.sonarr), movies = value(data?.radarr), indexers = value(data?.prowlarr)
  const requests = value(data?.seerr)
  const running = containers ? Object.values(containers).filter(c => c.state === 'running').length : null
  const unhealthy = containers ? Object.values(containers).filter(c => c.health === 'unhealthy').length : null
  const warnings = tv && movies && indexers ? tv.warnings + movies.warnings + indexers.warnings : null
  const errors = tv && movies && indexers ? tv.errors + movies.errors + indexers.errors : null
  const metrics: [string, string][] = [
    ['Running Containers', running == null ? '—' : `${running} / ${Object.keys(containers ?? {}).length}`], ['Unhealthy Containers', fmt(unhealthy)],
    ['Download Speed', rate(download?.download_bps)], ['Upload Speed', rate(download?.upload_bps)],
    ['Downloading', fmt(download?.downloading)], ['Queued Torrents', fmt(download?.queued)], ['Seeding', fmt(download?.seeding)],
    ['Stalled Downloads', fmt(download?.stalled)], ['Torrent Errors', fmt(download?.errors)], ['Stopped Torrents', fmt(download?.stopped)],
    ['Other Torrent States', fmt(download?.other)], ['Monitored Movies Without Files', fmt(movies?.missing)],
    ['Missing Monitored Episodes', fmt(tv?.missing)], ['Movie Queue Items', fmt(movies?.queue_items)], ['Episode Queue Items', fmt(tv?.queue_items)],
    ['Awaiting Import / Importing', fmt(sum(tv?.awaiting_import, movies?.awaiting_import))],
    ['Queue Warnings', fmt(sum(tv?.queue_warnings, movies?.queue_warnings))], ['Queue Errors', fmt(sum(tv?.queue_errors, movies?.queue_errors))],
    ['Pending Requests', fmt(requests?.pending)], ['Application Warnings', fmt(warnings)], ['Application Errors', fmt(errors)],
  ]
  return <section className="panel service-detail media-panel">
    <div className="media-heading"><h2>Media Stack</h2><span className="history-muted">Live Aggregates · 30-Second Refresh</span></div>
    {error && <p role="status">{error}</p>}
    {!data && !error && <p role="status">Loading media telemetry…</p>}
    {containers && <div className="media-services">{Object.entries(containers).map(([name, c]) => <span key={name}>{names[name] ?? name}: {c.state}{c.health !== 'none' ? ` · ${c.health}` : ''}</span>)}</div>}
    <div className="media-metrics">{metrics.map(([label, text]) => <div className="media-metric" key={label}><span>{label}</span><strong>{text}</strong></div>)}</div>
    <div className="media-readings">{data && (['containers', 'downloads', 'sonarr', 'radarr', 'prowlarr', 'seerr'] as const).map(key => <span key={key}>{({ containers: 'Container Status', downloads: 'Downloads', sonarr: 'TV Pipeline', radarr: 'Movie Pipeline', prowlarr: 'Indexers', seerr: 'Requests' })[key]}: {data[key].state === 'ready' && data[key].updated_at != null ? new Date(data[key].updated_at! * 1000).toLocaleTimeString() : messages[data[key].state] ?? 'Unavailable'}</span>)}</div>
    <p className="history-muted">Torrent states and movie/episode queues overlap; they are not combined into a download total. Missing movies may include unreleased titles. Application alerts cover Sonarr, Radarr and Prowlarr. Gluetun’s container health is not a VPN leak test.</p>
    <nav className="media-links" aria-label="Media Services">{['sonarr', 'radarr', 'prowlarr', 'seerr', 'qbittorrent'].map(name => <a key={name} href={`https://${name}.atlas.home.arpa/`} target="_blank" rel="noopener noreferrer">{names[name]} ↗</a>)}</nav>
  </section>
}
