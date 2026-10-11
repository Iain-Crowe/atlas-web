import PiHolePanel from "./PiHolePanel"
import JellyfinPanel from "./JellyfinPanel"
import HistoryPanel from "./HistoryPanel"
import ServiceIdentity from "./ServiceIdentity"
import type { ManagedService, MinecraftStatus, ServiceAction } from "../types"

type Props = {
  service: ManagedService | null
  minecraftStatus: MinecraftStatus | null
  minecraftError: string | null
  actionLoading: ServiceAction | null
  actionsDisabled: boolean
  actionError: string | null
  onAction: (action: ServiceAction) => Promise<void>
}
type MetricTone = "good" | "warn" | "danger" | "neutral"

function Metric({ label, value, tone = "good", percent }: {
  label: string; value: string; tone?: MetricTone; percent?: number
}) {
  return <div className={`service-metric metric-${tone}`}>
    <span>{label}</span><strong>{value}</strong>
    {percent !== undefined && Number.isFinite(percent) && <div className="meter" aria-hidden="true"><div className={`meter-fill ${tone}`} style={{ width: `${Math.max(0, Math.min(100, percent))}%` }} /></div>}
  </div>
}

export default function ServiceDetail({ service, minecraftStatus, minecraftError, actionLoading, actionsDisabled, actionError, onAction }: Props) {
  if (!service) return <section className="panel service-detail"><div className="empty-state"><h2>Service Details</h2><p>Select a service to view details.</p></div></section>
  const state = service.runtime?.state
  const canStart = ["exited", "dead", "created"].includes(state ?? "")
  const canControl = state === "running"
  const tps = minecraftStatus?.tps ?? null
  const mspt = minecraftStatus?.mspt ?? null
  const tpsTone: MetricTone = tps === null ? "neutral" : tps < 18 ? "danger" : tps < 19.5 ? "warn" : "good"
  const msptTone: MetricTone = mspt === null ? "neutral" : mspt >= 45 ? "danger" : mspt >= 35 ? "warn" : "good"
  const knownService = ["minecraft", "jellyfin", "pihole"].includes(service.name)
  const actions = <div className="service-actions" aria-label="Service controls">
    {canStart && <button className="service-action-button primary" disabled={actionsDisabled} onClick={() => void onAction("start")}>{actionLoading === "start" ? "Starting..." : "Start"}</button>}
    {canControl && <>
      <button className="service-action-button" disabled={actionsDisabled} onClick={() => void onAction("restart")}>{actionLoading === "restart" ? "Restarting..." : "Restart"}</button>
      <button className="service-action-button danger" disabled={actionsDisabled} onClick={() => void onAction("stop")}>{actionLoading === "stop" ? "Stopping..." : "Stop"}</button>
    </>}
  </div>

  return <section className="panel service-detail service-themed" data-service={knownService ? service.name : "generic"}>
    <ServiceIdentity name={service.name} title={service.display_name} state={state} actions={actions} />
    {actionError && <p className="action-error" role="alert">{actionError}</p>}
    {service.name === "minecraft" && <>
      {minecraftError && <p className="history-warning" role="status">{minecraftError}</p>}
      {!minecraftStatus && !minecraftError && state === "running" && <p className="muted" role="status">Loading live Minecraft telemetry…</p>}
      <section className="service-live-section" aria-label="Live Minecraft telemetry">
        <div className="section-heading"><h3>Live Server Metrics</h3><span className="section-meta">3s refresh</span></div>
        <div className="service-key-metrics">
          <Metric label="Players Online" value={minecraftStatus ? `${minecraftStatus.online} / ${minecraftStatus.max}` : "Unavailable"} tone={minecraftStatus ? "good" : "neutral"} />
          <Metric label="TPS" value={tps === null ? "Unavailable" : tps.toFixed(1)} tone={tpsTone} percent={tps === null ? undefined : tps / 20 * 100} />
          <Metric label="Tick Time · MSPT" value={mspt === null ? "Unavailable" : `${mspt.toFixed(2)} ms`} tone={msptTone} percent={mspt === null ? undefined : mspt / 50 * 100} />
          <Metric label="Loaded Chunks" value={minecraftStatus?.loaded_chunks == null ? "Unavailable" : minecraftStatus.loaded_chunks.toLocaleString()} tone={minecraftStatus?.loaded_chunks == null ? "neutral" : "good"} />
        </div>
        <div className="online-players"><h4>Online Players</h4><p>{minecraftStatus ? minecraftStatus.players.length > 0 ? minecraftStatus.players.join(", ") : "No players online." : "Player list unavailable."}</p></div>
      </section>
      <HistoryPanel key={service.id} kind="minecraft" serviceId={service.id} />
    </>}
    {service.name === "jellyfin" && <JellyfinPanel key={service.id} serviceId={service.id} />}
    {service.name === "pihole" && <PiHolePanel key={service.id} serviceId={service.id} />}
    {!knownService && <div className="generic-service-details"><h3>Runtime Details</h3><dl><div><dt>Service Name</dt><dd>{service.name}</dd></div><div><dt>Runtime</dt><dd>{service.runtime_type}</dd></div><div><dt>Runtime Name</dt><dd>{service.runtime_name ?? "Unavailable"}</dd></div></dl></div>}
  </section>
}
