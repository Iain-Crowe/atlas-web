import { isMinecraftService } from "../utils/minecraft"
import type { ReactNode } from "react"
import ServiceResources from "./ServiceResources"
import useNow from "../hooks/useNow"
import { serviceLabel } from "../utils/serviceStatus"
import Freshness from "./Freshness"
import PiHolePanel from "./PiHolePanel"
import NodesPanel from "./NodesPanel"
import JellyfinPanel from "./JellyfinPanel"
import HistoryPanel from "./HistoryPanel"
import ServiceIdentity from "./ServiceIdentity"
import type { ManagedService, MinecraftStatus, ServiceAction } from "../types"

type Props = {
  serverSelector?: ReactNode
  service: ManagedService | null
  minecraftUpdatedAt: number | null
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

export default function ServiceDetail({ serverSelector, service, minecraftUpdatedAt, minecraftStatus, minecraftError, actionLoading, actionsDisabled, actionError, onAction }: Props) {
  const now = useNow()
  if (!service) return <section className="panel service-detail"><div className="empty-state"><h2>Service Details</h2><p>Select a service to view details.</p></div></section>
  const isMinecraft = isMinecraftService(service)
  const state = service.runtime?.state
  const canStart = service.controls_available !== false && ["exited", "dead", "created"].includes(state ?? "")
  const canControl = service.controls_available !== false && state === "running"
  const tps = minecraftStatus?.tps ?? null
  const mspt = minecraftStatus?.mspt ?? null
  const tpsTone: MetricTone = tps === null ? "neutral" : tps < 18 ? "danger" : tps < 19.5 ? "warn" : "good"
  const msptTone: MetricTone = mspt === null ? "neutral" : mspt >= 45 ? "danger" : mspt >= 35 ? "warn" : "good"
  const knownService = isMinecraft || ["jellyfin", "pihole"].includes(service.name)
  const appLinks: Record<string, string> = {
    jellyfin: "https://jellyfin.home.arpa/", pihole: "https://pihole.atlas.home.arpa/admin/",
    actual: "https://actual.atlas.home.arpa/", homebox: "https://homebox.atlas.home.arpa/",
    changedetection: "https://changedetection.atlas.home.arpa/",
  }
  const appUrl = Object.hasOwn(appLinks, service.name) ? appLinks[service.name] : undefined
  const actions = <div className="service-actions" aria-label="Service controls">
    {appUrl && (state === "running" ? <a className="service-action-button primary open-app" href={appUrl} target="_blank" rel="noopener noreferrer" aria-label={`Open ${service.display_name} App in a new tab`}>Open App ↗</a>
      : <button className="service-action-button primary" disabled title="Available when the service is running">Open App ↗</button>)}
    {canStart && <button className="service-action-button primary" disabled={actionsDisabled} onClick={() => void onAction("start")}>{actionLoading === "start" ? "Starting..." : "Start"}</button>}
    {canControl && <>
      <button className="service-action-button" disabled={actionsDisabled} onClick={() => void onAction("restart")}>{actionLoading === "restart" ? "Restarting..." : "Restart"}</button>
      <button className="service-action-button danger" disabled={actionsDisabled} onClick={() => void onAction("stop")}>{actionLoading === "stop" ? "Stopping..." : "Stop"}</button>
    </>}
  </div>

  return <section className="panel service-detail service-themed" data-service={isMinecraft ? "minecraft" : knownService ? service.name : "generic"}>
    <ServiceIdentity name={service.name} title={service.display_name} state={state} statusLabel={serviceLabel(service, now)} actions={actions} selector={serverSelector} resources={<ServiceResources service={service} graphical />} />
    <p className="muted">{service.node_label ?? "Atlas"}{service.controls_available === false ? " · Read-only monitoring" : ""}</p>
    {actionError && <p className="action-error" role="alert">{actionError}</p>}
    {isMinecraft && <>
      {state === "running" && <Freshness timestamp={minecraftUpdatedAt} maxAge={25} error={!!minecraftError} />}
      {minecraftError && <p className="history-warning" role="status">{minecraftError}</p>}
      {!minecraftStatus && !minecraftError && state === "running" && <p className="muted" role="status">Loading live Minecraft telemetry…</p>}
      <section className="service-live-section" aria-label="Live Minecraft telemetry">
        <div className="section-heading"><h3>Server Metrics</h3><span className="section-meta">3s refresh</span></div>
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
    {service.name === "jellyfin" && <><NodesPanel guestOnly /><JellyfinPanel key={service.id} serviceId={service.id} /></>}
    {service.name === "pihole" && <PiHolePanel key={service.id} serviceId={service.id} />}
    {service.name === "actual" && (
      <section className="service-live-section" aria-label="Actual Budget">
        <div className="section-heading">
          <h3>Personal Finance</h3>
        </div>
        <p className="muted">
          Open Actual Budget to manage accounts and transactions.
        </p>
        {state !== "running" && (
          <p className="muted" role="status">
            {canStart ? "Start the service to open Actual Budget." : "Actual Budget is not currently reported as running."}
          </p>
        )}
      </section>
    )}
    {service.name === "homebox" && (
      <section className="service-live-section" aria-label="HomeBox">
        <div className="section-heading">
          <h3>HomeBox</h3>
        </div>
        <p className="muted">Organize possessions, locations, purchase details, receipts, and warranties.</p>
        {state !== "running" && <p className="muted" role="status">{canStart ? "Start the service to open HomeBox." : "The service is not currently reported as running."}</p>}
      </section>
    )}
    {service.name === "changedetection" && (
      <section className="service-live-section" aria-label="Changedetection">
        <div className="section-heading">
          <h3>Changedetection</h3>
        </div>
        <p className="muted">Manage website watches, inspect changes, and configure notifications.</p>
        {state !== "running" && <p className="muted" role="status">{canStart ? "Start the service to open Changedetection." : "The service is not currently reported as running."}</p>}
      </section>
    )}
    {!knownService && <div className="generic-service-details"><h3>Runtime Details</h3><dl><div><dt>Service Name</dt><dd>{service.name}</dd></div><div><dt>Runtime</dt><dd>{service.runtime_type}</dd></div><div><dt>Runtime Name</dt><dd>{service.runtime_name ?? "Unavailable"}</dd></div></dl></div>}
  </section>
}
