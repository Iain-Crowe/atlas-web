import { retainReadings } from "../utils/retainReadings"
import ReadingSummary from "./ReadingSummary"
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
  ready: "", warming_up: "Waiting for the first reading…", not_configured: "Library counts are not configured. VM health and resource metrics are available above.",
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
        if (!disposed) { setData(previous => retainReadings(previous, snapshot)); setError(null) }
      } catch (reason) {
        if (!disposed) { setError(reason instanceof Error ? reason.message : "Jellyfin telemetry unavailable") }
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
        {Object.entries(labels).filter(([key]) => ["MovieCount", "SeriesCount", "EpisodeCount"].includes(key) || (data?.counts.values?.[key] ?? 0) > 0).map(([key, label]) =>
          <div className="jellyfin-metric" key={key}><span>{label}</span><strong>{data?.counts.updated_at != null ? data.counts.values?.[key]?.toLocaleString() ?? "Unavailable" : "—"}</strong></div>)}
      </div>
      <p className="history-muted">From the VM’s indexed library.</p>
    </section>
    <section className="jellyfin-storage">
      <h3>Media Storage · Atlas</h3>
      <div className="jellyfin-counts">
        <div className="jellyfin-metric"><span>Media Folder Usage</span><strong>{size(data?.storage.updated_at != null ? data.storage.used_bytes : null)}</strong></div>
        <div className="jellyfin-metric"><span>Data Drive Free</span><strong>{size(data?.drive.updated_at != null ? data.drive.free_bytes : null)}</strong></div>
        <div className="jellyfin-metric"><span>Data Drive Capacity</span><strong>{size(data?.drive.updated_at != null ? data.drive.total_bytes : null)}</strong></div>
      </div>
      {data && data.storage.state !== "ready" && <p className="history-muted" role="status">Media scan: {messages[data.storage.state]}</p>}
      {data && data.drive.state !== "ready" && <p className="history-muted" role="status">Data drive: {messages[data.drive.state]}</p>}
      <p className="history-muted">{data?.media_path ?? "/srv/data/media"}<br />Served to Cronus over read-only NFS.</p>

    </section>
    <ReadingSummary error={!!error} readings={[
      { name: "Library", timestamp: data?.counts.updated_at, maxAge: 660, available: data?.counts.state === "ready" },
      { name: "Folder Scan", timestamp: data?.storage.updated_at, maxAge: 900, available: data?.storage.state === "ready" },
      { name: "Drive", timestamp: data?.drive.updated_at, maxAge: 90, available: data?.drive.state === "ready" },
    ]} cadence="Library/folder every 5m · Drive every 30s" />
  </div>
}
