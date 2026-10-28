import useNow from "../hooks/useNow"
import type { ManagedService } from "../types"
import { serviceLabel } from "../utils/serviceStatus"

function duration(seconds: number): string {
  if (seconds < 60) return `${Math.floor(seconds)}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.floor(seconds % 3600 / 60)}m`
  return `${Math.floor(seconds / 86400)}d ${Math.floor(seconds % 86400 / 3600)}h`
}
function memory(bytes: number): string {
  return bytes >= 1024 ** 3 ? `${(bytes / 1024 ** 3).toFixed(1)} GiB` : `${Math.round(bytes / 1024 ** 2)} MiB`
}
function Ring({ percent, clock = false }: { percent: number | null; clock?: boolean }) {
  const fill = percent == null ? 0 : Math.max(0, Math.min(100, percent))
  return <svg className="resource-ring" viewBox="0 0 48 48" aria-hidden="true">
    <circle className="resource-ring-track" cx="24" cy="24" r="20" />
    {clock ? <path className="resource-clock" d="M24 12v12l8 5" /> : <circle className="resource-ring-value" cx="24" cy="24" r="20" pathLength="100" strokeDasharray={`${fill} 100`} transform="rotate(-90 24 24)" />}
  </svg>
}
export default function ServiceResources({ service, graphical = false }: { service: ManagedService; graphical?: boolean }) {
  const now = useNow()
  const cachedMetrics = service.node_id === "cronus-jellyfin"
  const row = service.resources
  const age = row?.sampled_at == null ? null : Math.max(0, now - row.sampled_at)
  const observedAge = row?.observed_at == null ? Infinity : Math.max(0, now - row.observed_at)
  const stopped = !!row && !['running', 'unavailable'].includes(row.state)
  const maxAge = service.node_id === "cronus-jellyfin" ? 60 : 20
  const stale = !!service.resourcesError || row?.telemetry !== 'ready' || age === null || age > maxAge || observedAge > maxAge
  const uptime = row?.uptime_seconds == null ? '—' : duration(row.uptime_seconds + (!cachedMetrics && !stale && row.state === 'running' ? observedAge : 0))
  const label = cachedMetrics ? age === null ? 'No reading yet' : 'Latest reading' : stopped ? serviceLabel(service, now) : stale ? age === null ? 'Telemetry Unavailable' : 'Stale' : 'Live'
  return <span className={`service-resources ${graphical ? "resource-graphical" : ""} ${stale && !cachedMetrics ? 'resource-stale' : ''}`}>
    <span className="resource-values">
      <span>{graphical && <Ring percent={null} clock />}<span className="resource-label">Uptime</span><strong>{uptime}</strong></span>
      <span title="Docker CPU usage: 100% equals one logical CPU; values may exceed 100%.">{graphical && <Ring percent={row?.cpu_percent ?? null} />}<span className="resource-label">CPU</span><strong>{row?.cpu_percent == null ? '—' : `${row.cpu_percent.toFixed(1)}%`}</strong></span>
      <span title={row?.limit_configured ? 'Memory working set / configured container limit' : `No container memory limit configured${row?.memory_limit_bytes ? `; host capacity ${memory(row.memory_limit_bytes)}` : ''}`}>{graphical && <Ring percent={row?.memory_used_bytes != null && row.memory_limit_bytes ? row.memory_used_bytes / row.memory_limit_bytes * 100 : null} />}<span className="resource-label">Memory</span><strong>{row?.memory_used_bytes == null ? '—' : memory(row.memory_used_bytes)}{row?.memory_used_bytes != null && <small>{row.limit_configured && row.memory_limit_bytes != null ? ` / ${memory(row.memory_limit_bytes)}` : !row.limit_configured ? ' · No Limit' : ''}</small>}</strong></span>
    </span>
    <span className="resource-freshness" title={age !== null ? `Updated ${duration(age)} ago` : "No reading available"}>{label}<span className="resource-age-tooltip" role="tooltip">{age !== null ? `Updated ${duration(age)} ago` : 'No reading available'}</span></span>
  </span>
}
