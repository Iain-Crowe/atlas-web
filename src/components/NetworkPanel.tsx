import { useEffect, useState } from "react"
import { apiFetch } from "../api"
import StatusBanner from "./StatusBanner"
import HistoryPanel from "./HistoryPanel"

const NETWORK_LABELS: Record<string, string> = {
  host: "Atlas Host", minecraft: "Minecraft", jellyfin: "Jellyfin", pihole: "Pi-hole",
  gluetun: "Gluetun", qbittorrent: "qBittorrent", radarr: "Radarr", sonarr: "Sonarr",
  prowlarr: "Prowlarr", seerr: "Seerr", flaresolverr: "FlareSolverr",
  "atlas-web": "Atlas Web", "atlas-api": "Atlas API", "atlas-collector": "Atlas Collector",
}
type Reading = {
  source: string; members: string[]; interfaces: string[]; state: string
  observed_at: number; rx_mbps: number | null; tx_mbps: number | null
}
type Quality = {
  observed_at: number; router: string; interface: string; ping_state: string; wifi_state: string
  packets_sent: number | null; packets_received: number | null; latency_ms: number | null
  loss_percent: number | null; signal_dbm: number | null; rx_link_mbps: number | null; tx_link_mbps: number | null
}
type Snapshot = { readings: Reading[]; sample_seconds: number; quality?: Quality | null }
const valueWithUnit = (value: number | null | undefined, unit: string) => value == null ? "Unavailable" : `${value.toLocaleString(undefined, { maximumFractionDigits: 1 })} ${unit}`
const rate = (value: number | null | undefined) => value == null ? "—" : `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} Mbps`
const states: Record<string, string> = { ok: "Connected", warming_up: "Warming Up", down: "Link Down",
  stopped: "Stopped", unavailable: "Unavailable", unsupported: "Unsupported Network Mode" }
const label = (reading: Reading) => reading.members.length > 1
  ? reading.members.map(name => NETWORK_LABELS[name] ?? name).join(" + ")
  : NETWORK_LABELS[reading.source] ?? reading.source

export default function NetworkPanel() {
  const [data, setData] = useState<Snapshot | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [source, setSource] = useState("host")
  useEffect(() => {
    let disposed = false
    let timer: ReturnType<typeof setTimeout> | undefined
    let controller: AbortController | undefined
    async function poll() {
      controller = new AbortController()
      const timeout = setTimeout(() => controller?.abort(), 12000)
      try {
        const response = await apiFetch("/network/status", { signal: controller.signal })
        if (!response.ok) throw new Error(`Network telemetry unavailable (${response.status})`)
        const snapshot: Snapshot = await response.json()
        const now = Date.now() / 1000
        snapshot.readings = snapshot.readings.map(reading => now - reading.observed_at > 20
          ? { ...reading, state: "unavailable", rx_mbps: null, tx_mbps: null } : reading)
        if (snapshot.quality && now - snapshot.quality.observed_at > 35) snapshot.quality = null
        if (!disposed) { setData(snapshot); setError(null) }
      } catch (reason) {
        if (!disposed) { setData(null); setError(reason instanceof Error ? reason.message : "Network telemetry unavailable") }
      } finally {
        clearTimeout(timeout)
        if (!disposed) timer = setTimeout(() => void poll(), 5000)
      }
    }
    void poll()
    return () => { disposed = true; controller?.abort(); clearTimeout(timer) }
  }, [])
  const readings = data?.readings ?? []
  const quality = data?.quality
  const host = readings.find(reading => reading.source === "host")
  const services = readings.filter(reading => reading.source !== "host").sort((a, b) =>
    ((b.rx_mbps ?? 0) + (b.tx_mbps ?? 0)) - ((a.rx_mbps ?? 0) + (a.tx_mbps ?? 0)) || a.source.localeCompare(b.source))
  const selected = readings.find(reading => reading.source === source)
  return <section className="panel network-panel">
    <h2>Network Monitoring</h2>
    <p className="history-muted">LAN and internet traffic. Service readings include internal Docker traffic and are not additive to the host total.</p>
    {error && <p role="status" className="history-warning">{error}</p>}
    {!data && !error && <p role="status">Loading network telemetry…</p>}
    <StatusBanner tone={error || !host || host.state !== "ok" && host.state !== "down" ? "unavailable" : host.state === "down" || quality?.ping_state === "no_reply" || quality?.wifi_state === "disconnected" ? "attention" : "good"}
      title={error ? "Network Readings Unavailable" : !host ? "Waiting for Network Readings" : host.state === "down" ? "Host Link Is Down" : quality?.wifi_state === "disconnected" ? "Wi-Fi Disconnected" : quality?.ping_state === "no_reply" ? "Router Is Not Responding" : host.state === "ok" ? "Host Link Connected" : "Host Link Status Unavailable"}
      description={host?.state === "ok" ? `Receive ${rate(host.rx_mbps)} · Send ${rate(host.tx_mbps)}` : "Check the readings below for connection details."} />
    <div className="network-layout">
      <div className="network-live">
        <button type="button" className="network-host" aria-pressed={source === "host"} onClick={() => setSource("host")}>
          <strong>Atlas Host · {host?.interfaces.join(", ") || "Interface unavailable"}</strong>
          <span>Receive: {rate(host?.rx_mbps)}</span><span>Send: {rate(host?.tx_mbps)}</span>
          <small>{states[host?.state ?? "unavailable"]}</small>
        </button>
        <button type="button" className="network-service network-quality" aria-pressed={source === "link"} onClick={() => setSource("link")}>
          <strong>Router &amp; Wi-Fi Health</strong>
          <span>Router: {quality?.router ?? "Unavailable"}</span>
          <span>Latency: {valueWithUnit(quality?.latency_ms, "ms")}</span>
          <span>Probe Loss: {valueWithUnit(quality?.loss_percent, "%")}</span>
          <span>Signal: {valueWithUnit(quality?.signal_dbm, "dBm")}</span>
          <span>Receive Link: {valueWithUnit(quality?.rx_link_mbps, "Mbps")}</span>
          <span>Send Link: {valueWithUnit(quality?.tx_link_mbps, "Mbps")}</span>
          {quality?.packets_sent != null && <small>{quality.packets_received}/{quality.packets_sent} router replies · Every 15s</small>}
          {quality?.wifi_state === "disconnected" && <small>Wi-Fi Disconnected</small>}
          {quality?.ping_state === "no_reply" && <small>No Router Replies</small>}
          {quality && <small>Updated {new Date(quality.observed_at * 1000).toLocaleTimeString()}</small>}
        </button>
        <h3>Service Bandwidth</h3>
        <p className="history-muted">Select a service to view its history. Shared networking is measured once.</p>
        <div className="network-service-list">
          {services.map(reading => <button type="button" key={reading.source}
            className="network-service" aria-pressed={source === reading.source} onClick={() => setSource(reading.source)}>
            <strong>{label(reading)}</strong>
            <span>↓ {rate(reading.rx_mbps)} · ↑ {rate(reading.tx_mbps)}</span>
            {reading.state !== "ok" && <small>{states[reading.state] ?? reading.state}</small>}
          </button>)}
        </div>
        {host && <p className="history-muted">Updated {new Date(host.observed_at * 1000).toLocaleTimeString()}</p>}
      </div>
      <HistoryPanel key={source} kind="network" source={source}
        title={source === "link" ? "Router & Wi-Fi History" : `${selected ? label(selected) : NETWORK_LABELS[source] ?? source} Network History`} />
    </div>
  </section>
}
