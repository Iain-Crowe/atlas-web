import { retainReadings } from "../utils/retainReadings"
import useNow from "../hooks/useNow"
import { useEffect, useState } from "react"
import "./MediaPanel.css"
import MediaServiceBadge from "./MediaServiceBadge"
import ServiceIdentity from "./ServiceIdentity"
import StatusBanner from "./StatusBanner"
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
const value = <T,>(reading: Reading<T> | undefined): T | null => reading?.updated_at != null ? reading.values : null
const countLabel = (count: number, label: string) => `${count} ${label}${count === 1 ? "" : "s"}`
const fmt = (n: number | null | undefined) => n == null ? "—" : n.toLocaleString()
const rate = (n: number | undefined) => n == null ? "—" : `${(n * 8 / 1e6).toFixed(2)} Mbps`
const sum = (a: number | undefined, b: number | undefined) => a == null || b == null ? null : a + b

type MetricTone = "neutral" | "activity" | "library" | "good" | "warning" | "danger"
const activityTone = (n: number | null | undefined, tone: MetricTone = "activity"): MetricTone =>
  n == null || !Number.isFinite(n) || n <= 0 ? "neutral" : tone
const alertTone = (n: number | null | undefined, tone: "warning" | "danger"): MetricTone =>
  n == null || !Number.isFinite(n) ? "neutral" : n > 0 ? tone : "good"

const readingNames = { containers: "Containers", downloads: "Downloads", sonarr: "Sonarr", radarr: "Radarr", prowlarr: "Prowlarr", seerr: "Seerr" } as const

function MediaFreshness({ data, error }: { data: Snapshot | null; error: string | null }) {
  const now = useNow()
  if (!data) return <p className="media-freshness">{error ? "Telemetry unavailable" : "Waiting for telemetry"} · Refreshes every 30s</p>
  const sources = (Object.keys(readingNames) as (keyof Snapshot)[]).map(key => ({ name: readingNames[key], reading: data[key] }))
  const ready = sources.filter(({ reading }) => reading.updated_at != null && Number.isFinite(reading.updated_at))
  const unavailable = sources.filter(source => !ready.includes(source) || source.reading.state !== "ready").map(({ name, reading }) => `${name}: ${messages[reading.state] ?? "No timestamp"}`)
  const stale = ready.filter(({ reading }) => reading.state === "ready" && (error || now - reading.updated_at! > 90)).map(({ name }) => name)
  return <p className="media-freshness" tabIndex={0} title={ready.map(({ name, reading }) => `${name}: ${new Date(reading.updated_at! * 1000).toLocaleString()}`).join("\n")}>
    <span>{!ready.length ? "No current readings" : stale.length || unavailable.length ? "Telemetry needs attention" : "Readings current"}</span>
    {stale.length > 0 && <span className="media-freshness-warning"> · Stale: {stale.join(", ")}</span>}
    {unavailable.length > 0 && <span className="media-freshness-warning"> · {unavailable.join(" · ")}</span>}
  </p>
}

type MediaMetric = [string, string, MetricTone]
function MetricValues({ metrics, className = "" }: { metrics: MediaMetric[]; className?: string }) {
  return <dl className={`media-metrics ${className}`}>{metrics.map(([label, text, tone]) => <div className={`media-metric media-tone-${tone}`} key={label}><dt>{label}</dt><dd>{text}</dd></div>)}</dl>
}

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
        if (!disposed) { setData(previous => retainReadings(previous, snapshot)); setError(null) }
      } catch (reason) {
        if (!disposed) { setError(reason instanceof Error ? reason.message : "Media Telemetry Unavailable") }
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
  const metrics: [string, string, MetricTone][] = [
    ['Running Containers', running == null ? '—' : `${running} / ${Object.keys(containers ?? {}).length}`, 'neutral'],
    ['Unhealthy Containers', fmt(unhealthy), alertTone(unhealthy, 'danger')],
    ['Download Speed', rate(download?.download_bps), activityTone(download?.download_bps)],
    ['Upload Speed', rate(download?.upload_bps), activityTone(download?.upload_bps)],
    ['Downloading', fmt(download?.downloading), activityTone(download?.downloading)],
    ['Queued Torrents', fmt(download?.queued), activityTone(download?.queued)],
    ['Seeding', fmt(download?.seeding), activityTone(download?.seeding, 'good')],
    ['Stalled Downloads', fmt(download?.stalled), alertTone(download?.stalled, 'warning')],
    ['Torrent Errors', fmt(download?.errors), alertTone(download?.errors, 'danger')],
    ['Stopped Torrents', fmt(download?.stopped), 'neutral'],
    ['Other Torrent States', fmt(download?.other), 'neutral'],
    ['Monitored Movies Without Files', fmt(movies?.missing), activityTone(movies?.missing, 'library')],
    ['Missing Monitored Episodes', fmt(tv?.missing), activityTone(tv?.missing, 'library')],
    ['Movie Queue Items', fmt(movies?.queue_items), activityTone(movies?.queue_items, 'library')],
    ['Episode Queue Items', fmt(tv?.queue_items), activityTone(tv?.queue_items, 'library')],
    ['Awaiting Import / Importing', fmt(sum(tv?.awaiting_import, movies?.awaiting_import)), activityTone(sum(tv?.awaiting_import, movies?.awaiting_import), 'library')],
    ['Queue Warnings', fmt(sum(tv?.queue_warnings, movies?.queue_warnings)), alertTone(sum(tv?.queue_warnings, movies?.queue_warnings), 'warning')],
    ['Queue Errors', fmt(sum(tv?.queue_errors, movies?.queue_errors)), alertTone(sum(tv?.queue_errors, movies?.queue_errors), 'danger')],
    ['Pending Requests', fmt(requests?.pending), activityTone(requests?.pending)],
    ['Application Warnings', fmt(warnings), alertTone(warnings, 'warning')],
    ['Application Errors', fmt(errors), alertTone(errors, 'danger')],
  ]
  const alertSources: string[] = []
  for (const [name, health] of [["Sonarr", tv], ["Radarr", movies], ["Prowlarr", indexers]] as const) {
    if (!health) continue
    const details = [health.warnings > 0 ? countLabel(health.warnings, "application warning") : "", health.errors > 0 ? countLabel(health.errors, "application error") : ""]
    if ("queue_warnings" in health && Number(health.queue_warnings) > 0) details.push(countLabel(Number(health.queue_warnings), "queue warning"))
    if ("queue_errors" in health && Number(health.queue_errors) > 0) details.push(countLabel(Number(health.queue_errors), "queue error"))
    if (details.some(Boolean)) alertSources.push(`${name}: ${details.filter(Boolean).join(" · ")}`)
  }
  if (download?.errors) alertSources.push(`qBittorrent: ${countLabel(download.errors, "torrent error")}`)
  if (download?.stalled) alertSources.push(`qBittorrent: ${countLabel(download.stalled, "stalled download")}`)
  for (const [name, container] of Object.entries(containers ?? {})) {
    if (container.health === "unhealthy") alertSources.push(`${names[name] ?? name}: container unhealthy`)
  }
  const alertCount = errors === null || warnings === null || unhealthy === null ? null : errors + warnings + unhealthy
  const notRunning = containers ? Object.keys(containers).length - (running ?? 0) : null
  const libraryGroups = [
    { title: "Movies", source: "Radarr", metrics: [metrics[11], metrics[13]] },
    { title: "TV", source: "Sonarr", metrics: [metrics[12], metrics[14]] },
  ]
  return <section className="panel service-detail media-panel service-themed" data-service="media" data-alert-severity={(errors ?? 0) > 0 || (unhealthy ?? 0) > 0 ? "danger" : "normal"}>
    <ServiceIdentity name="media" title="Media Stack" />
    <StatusBanner tone={error || alertCount === null ? "unavailable" : alertSources.length > 0 || alertCount > 0 || (notRunning ?? 0) > 0 ? "attention" : "good"}
      title={error ? "Media Telemetry Unavailable" : alertCount === null ? "Application Status Incomplete" : alertCount > 0 ? `${alertCount} Application ${alertCount === 1 ? "Alert" : "Alerts"}` : alertSources.length > 0 ? "Media Services Need Attention" : (notRunning ?? 0) > 0 ? "Some Media Containers Are Not Running" : "No Application Alerts Reported"}
      description={containers ? `${running} of ${Object.keys(containers).length} containers running · ${unhealthy} unhealthy` : "Waiting for container readings."} />
    {alertSources.length > 0 && <ul className="media-alert-sources" aria-label="Alert Sources">{alertSources.map(message => <li key={message}>{message}</li>)}</ul>}
    {error && <p role="status" className="history-warning">{error}</p>}
    {!data && !error && <p role="status">Loading media telemetry…</p>}
    {containers && <div className="media-services">{Object.entries(containers).map(([name, c]) => <MediaServiceBadge key={name} name={name} label={names[name] ?? name} state={c.state} health={c.health} />)}</div>}
    <section className="metric-group media-group-activity">
      <h3>Downloads</h3>
      <MetricValues className="media-primary" metrics={[metrics[2], metrics[3], metrics[5], metrics[6]]} />
      <MetricValues className="media-secondary" metrics={[metrics[4], ...metrics.slice(7, 11)]} />
    </section>
    <section className="metric-group media-group-library">
      <h3>Library Pipeline</h3>
      <div className="media-library-grid">{libraryGroups.map(group => <section className="media-library-card" key={group.title}>
        <header><h4>{group.title}</h4><span>{group.source}</span></header>
        <MetricValues metrics={group.metrics} />
      </section>)}</div>
      <MetricValues className="media-secondary media-imports" metrics={[metrics[15]]} />
    </section>
    <section className="metric-group media-group-warning">
      <h3>Requests &amp; Alerts</h3>
      <MetricValues className="media-secondary" metrics={metrics.slice(16)} />
    </section>
    <MediaFreshness data={data} error={error} />
    <p className="history-muted">Torrent states and movie/episode queues overlap; they are not combined into a download total. Missing movies may include unreleased titles. Application alerts cover Sonarr, Radarr and Prowlarr. Gluetun’s container health is not a VPN leak test.</p>
    <nav className="media-links" aria-label="Media Services">{['sonarr', 'radarr', 'prowlarr', 'seerr', 'qbittorrent'].map(name => <a key={name} href={`https://${name}.atlas.home.arpa/`} target="_blank" rel="noopener noreferrer">{names[name]} ↗</a>)}</nav>
  </section>
}
