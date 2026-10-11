import { useId, useState } from "react"
import useHistory from "../hooks/useHistory"
import type { HistoryRange, TelemetryHistory } from "../types"

type Metric = { key: string; label: string; unit: string; scale?: number; ceiling?: number; floor?: number }
const LINK: Metric[] = [
  { key: "latency_ms", label: "Router Latency", unit: "ms" },
  { key: "loss_percent", label: "Router Probe Loss", unit: "%", ceiling: 100 },
  { key: "signal_dbm", label: "Wi-Fi Signal", unit: "dBm", floor: -100, ceiling: -20 },
  { key: "rx_link_mbps", label: "Wi-Fi Receive Link Rate", unit: "Mbps" },
  { key: "tx_link_mbps", label: "Wi-Fi Send Link Rate", unit: "Mbps" },
]
const NETWORK: Metric[] = [
  { key: "rx_mbps", label: "Receive", unit: "Mbps" },
  { key: "tx_mbps", label: "Send", unit: "Mbps" },
]
const HOST: Metric[] = [
  { key: "cpu_percent", label: "CPU", unit: "%", ceiling: 100 },
  { key: "temperature_c", label: "CPU Temperature", unit: "°C" },
  { key: "memory_used_mb", label: "Memory Used", unit: "GiB", scale: 1 / 1024 },
  { key: "disk_used_gb", label: "Data Disk Used", unit: "GiB" },
  { key: "load_1m", label: "Load (1 Minute)", unit: "" },
]
const MINECRAFT: Metric[] = [
  { key: "tps", label: "TPS", unit: "", ceiling: 20 },
  { key: "mspt", label: "Tick Time", unit: "ms" },
  { key: "players_online", label: "Players Online", unit: "" },
  { key: "loaded_chunks", label: "Loaded Chunks", unit: "" },
]
const formatTime = (timestamp: number) => new Date(timestamp * 1000).toLocaleString([], {
  month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit",
})

function MetricChart({ history, metric }: { history: TelemetryHistory; metric: Metric }) {
  const titleId = useId()
  const [selected, setSelected] = useState<number | null>(null)
  const points = history.points
  const scale = metric.scale ?? 1
  const values = points.map(point => point.metrics[metric.key])
  const available = values.some(value => value?.mean !== null && value?.mean !== undefined)
  const observed = values.filter(value => value?.mean != null)
  const floor = Math.min(metric.floor ?? 0, ...observed.map(value => (value.minimum ?? 0) * scale))
  const ceiling = Math.max(metric.ceiling ?? 1, floor + 1, ...observed.map(value => (value.maximum ?? 0) * scale))
  const x = (index: number) => 44 + Math.max(0, points[index].timestamp - history.start) / Math.max(1, history.end - history.start) * 532
  const y = (value: number) => 114 - (value * scale - floor) / (ceiling - floor) * 92
  const path = values.map((value, index) => {
    if (value?.mean == null) return ""
    const command = index > 0 && values[index - 1]?.mean != null ? "L" : "M"
    return `${command}${x(index).toFixed(2)},${y(value.mean).toFixed(2)}`
  }).join(" ")
  const index = Math.min(selected ?? Math.max(0, points.length - 1), points.length - 1)
  const current = values[index]
  const format = (value: number | null | undefined) => value == null ? "Unavailable" : `${(value * scale).toLocaleString(undefined, { maximumFractionDigits: 2 })}${metric.unit ? ` ${metric.unit}` : ""}`
  return <article className="history-chart">
    <div className="history-chart-heading"><h4>{metric.label}</h4><strong>{format(current?.mean)}</strong></div>
    {available ? <>
      <svg viewBox="0 0 600 140" role="img" aria-labelledby={titleId}>
        <title id={titleId}>{metric.label} History. Missing readings appear as gaps. Use the slider below to inspect values.</title>
        {[0, 0.5, 1].map(fraction => <g key={fraction}>
          <line x1="44" x2="576" y1={114 - fraction * 92} y2={114 - fraction * 92} className="history-gridline" />
          <text x="38" y={118 - fraction * 92} textAnchor="end">{(floor + (ceiling - floor) * fraction).toLocaleString(undefined, { maximumFractionDigits: 1 })}</text>
        </g>)}
        <path d={path} fill="none" className="history-line" />
        {values.map((value, i) => value?.mean == null ? null : <circle key={points[i].timestamp}
          cx={x(i)} cy={y(value.mean)} r={i === index ? 4 : 1.8}
          className={value.count < points[i].expected ? "history-partial" : "history-dot"}>
          <title>{formatTime(points[i].timestamp)}: {format(value.mean)}; min {format(value.minimum)}; max {format(value.maximum)}; {value.count}/{points[i].expected} readings</title>
        </circle>)}
      </svg>
      <input type="range" min="0" max={Math.max(0, points.length - 1)} value={Math.max(0, index)}
        aria-label={`Inspect ${metric.label} history`} onChange={event => setSelected(Number(event.target.value))} />
      <div className="history-chart-detail">
        <span>{points[index] ? formatTime(points[index].timestamp) : "No samples"}</span>
        <span>Min {format(current?.minimum)} · Max {format(current?.maximum)}</span>
        <span>{current?.count ?? 0}/{points[index]?.expected ?? 0} readings in this interval</span>
      </div>
    </> : <p className="history-muted">No readings in this period.</p>}
  </article>
}

export default function HistoryPanel({ kind, serviceId, source, title }: { kind: "host" | "minecraft" | "network"; serviceId?: number; source?: string; title?: string }) {
  const [range, setRange] = useState<HistoryRange>("1h")
  const path = kind === "network" ? `/network/${encodeURIComponent(source ?? "host")}/history` : kind === "host" ? "/system/history" : `/services/${serviceId}/minecraft/history`
  const { data, error, loading } = useHistory(path, range)
  const stale = data && (data.last_sample_at === null || data.end - data.last_sample_at > data.sample_seconds * 3)
  return <section className={`history-panel ${kind === "host" ? "panel host-history" : ""}`}>
    <div className="history-heading">
      <h3>{title ?? (kind === "host" ? "Host History" : "Minecraft History")}</h3>
      <div className="history-ranges" aria-label="History period">
        {(["1h", "6h", "24h", "7d"] as const).map(value => <button key={value} type="button"
          aria-pressed={range === value} onClick={() => setRange(value)}>{value}</button>)}
      </div>
    </div>
    {loading && <p role="status">Loading history…</p>}
    {error && <p role="status" className="history-warning">{error}. Displayed history may be stale.</p>}
    {data && <>
      <p className="history-muted">{formatTime(data.start)} – {formatTime(data.end)} · Local time<br />
        Samples every {data.sample_seconds}s · {data.bucket_seconds}s averages · {data.retention_days}-day retention.
        Gaps mean no reading; amber dots mark incomplete intervals.</p>
      {stale && <p role="status" className="history-warning">{data.last_sample_at === null
        ? "Waiting for the collector’s first sample."
        : `Collector is behind. Last sample: ${formatTime(data.last_sample_at)}.`}</p>}
      {data.last_sample_at !== null && (data.last_success_at === null || data.end - data.last_success_at > data.sample_seconds * 3) &&
        <p role="status" className="history-warning">Collection is running, but recent measurements are unavailable.</p>}
      {kind === "network" && source !== "link" && <p className="network-totals">
        <strong>Observed Transfer Totals</strong><br />
        Received {((data.received_bytes ?? 0) / 1024 ** 3).toLocaleString(undefined, { maximumFractionDigits: 3 })} GiB · Sent {((data.sent_bytes ?? 0) / 1024 ** 3).toLocaleString(undefined, { maximumFractionDigits: 3 })} GiB<br />
        <small>{((data.covered_seconds ?? 0) / 60).toLocaleString(undefined, { maximumFractionDigits: 1 })} minutes measured in this period. Gaps and partial boundary intervals are excluded.</small>
      </p>}
      {source === "link" && <p className="history-muted">Five router probes per reading. Loss averages are weighted by probes sent. Wi-Fi link rates are radio rates, not available internet bandwidth. Missing driver readings appear as gaps.</p>}
      <div className="history-grid">{(kind === "network" ? (source === "link" ? LINK : NETWORK) : kind === "host" ? HOST : MINECRAFT).map(metric =>
        <MetricChart key={`${kind}:${serviceId}:${range}:${metric.key}`} history={data} metric={metric} />)}</div>
    </>}
  </section>
}
