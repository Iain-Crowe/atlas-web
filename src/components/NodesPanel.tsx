import usePolling from "../hooks/usePolling"
import useNow from "../hooks/useNow"
import "./NodesPanel.css"

type Node<T> = { state: "ready" | "stale" | "unavailable"; sampled_at: number | null; data: T | null }
type Nas = { hostname: string; version: string; uptime_seconds: number;
  pools: { name: string; status: string; healthy: boolean }[];
  vms: { id: number; name: string; state: string; autostart: boolean; memory_mib: number }[] }
type Guest = { host: { uptime_seconds: number; cpu_percent: number; cpu_count: number; memory_used_bytes: number; memory_total_bytes: number };
  jellyfin: { state: string; health: string; media: { state: string; read_only: boolean | null } } }
type Snapshot = { truenas: Node<Nas>; vm: Node<Guest> }
const uptime = (seconds?: number) => seconds == null ? "—" : seconds >= 86400 ? `${Math.floor(seconds / 86400)}d ${Math.floor(seconds % 86400 / 3600)}h` : `${Math.floor(seconds / 3600)}h ${Math.floor(seconds % 3600 / 60)}m`
const size = (bytes?: number) => bytes == null ? "—" : `${(bytes / 1024 ** 3).toFixed(1)} GiB`

export default function NodesPanel({ guestOnly = false }: { guestOnly?: boolean }) {
  const { data, error } = usePolling<Snapshot>("/nodes/status", true, 15000)
  const now = useNow()
  function freshness(node?: Node<unknown>): string {
    if (node?.sampled_at == null) return "Unavailable"
    const age = Math.max(0, Math.floor(now - node.sampled_at))
    return error || node.state !== "ready" || age > 60 ? "Stale" : "Live"
  }
  const nas = data?.truenas.data
  const guest = data?.vm.data
  const media = guest?.jellyfin.media
  const nasFresh = freshness(data?.truenas)
  const vmFresh = freshness(data?.vm)
  return <section className="nodes-panel" aria-label="Cronus infrastructure">
    {!guestOnly && <div className="section-heading"><h2>Infrastructure</h2></div>}
    {error && <p className="history-warning" role="status">Node telemetry refresh unavailable</p>}
    <div className={`node-grid ${guestOnly ? "node-single" : ""}`}>
      {!guestOnly && <article className="node-card">
        <header><div><span className="eyebrow">Physical Host</span><h3>Cronus <small>TrueNAS</small></h3></div><span tabIndex={0} data-freshness-detail={data?.truenas.sampled_at ? `Updated ${new Date(data.truenas.sampled_at * 1000).toLocaleString()}` : "No reading available"} title={data?.truenas.sampled_at ? `Updated ${new Date(data.truenas.sampled_at * 1000).toLocaleString()}` : "No reading available"} className={nasFresh.startsWith("Live") ? "node-fresh" : "node-stale"}>{nasFresh}</span></header>
        <dl className="node-metrics"><div><dt>Uptime</dt><dd>{uptime(nas?.uptime_seconds)}</dd></div><div><dt>Version</dt><dd>{nas?.version ?? "—"}</dd></div></dl>
        <div className="node-dependencies">
          {nas?.pools.map(pool => <p key={pool.name}><span>{pool.name}</span><strong className={pool.healthy ? "node-fresh" : "node-stale"}>{pool.status === "ONLINE" ? "Online" : pool.status.replaceAll("_", " ").toLowerCase()}</strong></p>)}
          {nas?.vms.map(vm => <p key={vm.id}><span>{vm.name}</span><strong className={vm.state === "RUNNING" ? "node-fresh" : "node-stale"}>{vm.state === "RUNNING" ? "Running" : vm.state.replaceAll("_", " ").toLowerCase()}</strong></p>)}
          {!nas && <p className="muted">Pool and VM status unavailable</p>}
        </div>
        <a className="service-action-button open-app" href="https://cronus.home.arpa/" target="_blank" rel="noopener noreferrer">Open TrueNAS ↗</a>
      </article>}
      <article className="node-card">
        <header><div><span className="eyebrow">Debian VM · Hosted on Cronus</span><h3>Jellyfin VM</h3></div><span tabIndex={0} data-freshness-detail={data?.vm.sampled_at ? `Updated ${new Date(data.vm.sampled_at * 1000).toLocaleString()}` : "No reading available"} title={data?.vm.sampled_at ? `Updated ${new Date(data.vm.sampled_at * 1000).toLocaleString()}` : "No reading available"} className={vmFresh.startsWith("Live") ? "node-fresh" : "node-stale"}>{vmFresh}</span></header>
        <dl className="node-metrics"><div><dt>Uptime</dt><dd>{uptime(guest?.host.uptime_seconds)}</dd></div><div><dt>CPU</dt><dd>{guest ? `${guest.host.cpu_percent.toFixed(1)}%` : "—"}</dd></div><div><dt>Memory</dt><dd>{size(guest?.host.memory_used_bytes)}<small> / {size(guest?.host.memory_total_bytes)}</small></dd></div></dl>
        <div className="node-dependencies">
          <p><span>Jellyfin</span><strong>{guest ? guest.jellyfin.health === "none" ? guest.jellyfin.state : guest.jellyfin.health.charAt(0).toUpperCase() + guest.jellyfin.health.slice(1) : "Unavailable"}</strong></p>
          <p title="Mount metadata only; share accessibility has not been probed."><span>Media from Atlas</span><strong>{media?.state === "mounted" ? "NFS · Read-only" : media?.state === "not_mounted" ? "Not mounted" : media?.state === "unexpected_mount" ? "Unexpected mount" : "Unavailable"}</strong></p>
        </div>
        {!guestOnly && <a className="service-action-button open-app" href="https://jellyfin.home.arpa/" target="_blank" rel="noopener noreferrer">Open Jellyfin ↗</a>}
      </article>
    </div>
  </section>
}
