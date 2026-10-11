import Freshness from "./Freshness"
import { useEffect, useState } from "react"
import { apiFetch } from "../api"
import "./JellyfinPanel.css"

type State = "warming_up" | "ready" | "not_configured" | "unauthorized" | "unavailable"
type Snapshot = {
  counts: { state: State; updated_at: number | null; values: Record<string, number | null> }
  storage: { state: State; updated_at: number | null; used_bytes: number | null }
  drive: { state: State; updated_at: number | null; total_bytes: number | null; free_bytes: number | null }
  media_path: string
}
const labels: Record<string, string> = {
  MovieCount: "Movies", SeriesCount: "TV Series", EpisodeCount: "Episodes", SongCount: "Songs",
  AlbumCount: "Albums", ArtistCount: "Artists", MusicVideoCount: "Music Videos", BookCount: "Books",
  BoxSetCount: "Collections", TrailerCount: "Trailers", ProgramCount: "Programs",
}
const messages: Record<State, string> = {
  ready: "", warming_up: "Waiting for the first reading…", not_configured: "Jellyfin API access has not been configured.",
  unauthorized: "Jellyfin rejected the configured API key.", unavailable: "Currently unavailable.",
}
const size = (bytes: number | null | undefined) => bytes == null ? "Unavailable" : `${(bytes / 1024 ** 3).toLocaleString(undefined, { maximumFractionDigits: 2 })} GiB`

export default function JellyfinPanel({ serviceId }: { serviceId: number }) {
  const [data, setData] = useState<Snapshot | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let disposed = false
    let timer: ReturnType<typeof setTimeout> | undefined
    let controller: AbortController | undefined
    async function load() {
      controller = new AbortController()
      const timeout = setTimeout(() => controller?.abort(), 12000)
      try {
        const response = await apiFetch(`/services/${serviceId}/jellyfin/status`, { signal: controller.signal })
        if (!response.ok) throw new Error(`Jellyfin telemetry unavailable (${response.status})`)
        const snapshot: Snapshot = await response.json()
        if (!disposed) { setData(snapshot); setError(null) }
      } catch (reason) {
        if (!disposed) { setData(null); setError(reason instanceof Error ? reason.message : "Jellyfin telemetry unavailable") }
      } finally {
        clearTimeout(timeout)
        if (!disposed) timer = setTimeout(() => void load(), 30000)
      }
    }
    void load()
    return () => { disposed = true; controller?.abort(); clearTimeout(timer) }
  }, [serviceId])
  return <div className="jellyfin-panel">
    {error && <p className="history-warning" role="status">{error}</p>}
    {!data && !error && <p role="status">Loading Jellyfin telemetry…</p>}
    <section>
      <h3>Library Counts</h3>
      {data && data.counts.state !== "ready" && <p role="status" className="history-muted">{messages[data.counts.state]}</p>}
      <div className="jellyfin-counts">
        {Object.entries(labels).filter(([key]) => ["MovieCount", "SeriesCount", "EpisodeCount"].includes(key) || (data?.counts.values[key] ?? 0) > 0).map(([key, label]) =>
          <div className="jellyfin-metric" key={key}><span>{label}</span><strong>{data?.counts.state === "ready" ? data.counts.values[key]?.toLocaleString() ?? "Unavailable" : "—"}</strong></div>)}
      </div>
      <p className="history-muted"><Freshness timestamp={data?.counts.updated_at} maxAge={90} error={!!data && data.counts.state !== "ready"} /> · Refreshes every 30 seconds.<br />Counts reflect Jellyfin’s indexed library. Series and episodes are separate categories.</p>
    </section>
    <section>
      <h3>Media Storage</h3>
      <div className="jellyfin-counts">
        <div className="jellyfin-metric"><span>Media Folder Usage</span><strong>{size(data?.storage.used_bytes)}</strong></div>
        <div className="jellyfin-metric"><span>Data Drive Free</span><strong>{size(data?.drive.free_bytes)}</strong></div>
        <div className="jellyfin-metric"><span>Data Drive Capacity</span><strong>{size(data?.drive.total_bytes)}</strong></div>
      </div>
      {data && data.storage.state !== "ready" && <p className="history-muted" role="status">Media scan: {messages[data.storage.state]}</p>}
      {data && data.drive.state !== "ready" && <p className="history-muted" role="status">Data drive: {messages[data.drive.state]}</p>}
      <p className="history-muted">{data?.media_path ?? "/srv/data/media"} · <Freshness timestamp={data?.storage.updated_at} maxAge={900} error={!!data && data.storage.state !== "ready"} /><br />Folder scans run every five minutes. Drive space refreshes every 30 seconds.<br />Folder usage includes artwork and other files; it excludes Jellyfin’s separate config/cache folders. Hard-linked files are counted once within this folder.</p>
      <p className="history-muted">Drive: <Freshness timestamp={data?.drive.updated_at} maxAge={90} error={!!data && data.drive.state !== "ready"} /> · No historical data is stored.</p>
    </section>
  </div>
}
