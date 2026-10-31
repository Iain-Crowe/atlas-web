import { ServiceIcon } from "./ServiceIdentity"

const labels: Record<string, string> = {
  running: "Running", exited: "Stopped", dead: "Failed", created: "Created",
  paused: "Paused", restarting: "Restarting", removing: "Removing",
}

function StackIcon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    sonarr: "M16 4a12 12 0 1 0 12 12M16 9a7 7 0 1 0 7 7M16 16 27 5M20 4h8v8",
    radarr: "M16 4a12 12 0 1 0 0 24 12 12 0 0 0 0-24M16 9a7 7 0 1 0 0 14 7 7 0 0 0 0-14M16 16V4m0 12 9 7",
    prowlarr: "m5 10 5 4 6-8 6 8 5-4-3 15H8ZM10 21h12",
    seerr: "M6 5h20v17H16l-7 5v-5H6ZM11 11h10m-10 5h6",
    qbittorrent: "M10 4v17m-5-5 5 5 5-5M22 28V11m-5 5 5-5 5 5",
    gluetun: "m16 3 11 4v8c0 7-7 12-11 14C12 27 5 22 5 15V7ZM11 16l3 3 7-8",
    flaresolverr: "M17 3c2 8 9 10 9 17a10 10 0 0 1-20 0c0-4 2-7 6-11 0 5 2 6 3 7 3-5 3-8 2-13ZM17 18c3 4 4 5 3 7a4 4 0 0 1-7-3c0-1 1-3 4-4Z",
  }
  if (!paths[name]) return <ServiceIcon name={name} />
  return <svg className="service-icon" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d={paths[name]} /></svg>
}

export default function MediaServiceBadge({ name, label, state, health }: {
  name: string; label: string; state: string; health: string
}) {
  const failed = health === "unhealthy" || state === "dead"
  const normal = state === "running" && ["healthy", "none"].includes(health)
  const status = health === "unhealthy" ? "Unhealthy" : state === "running" && health === "starting" ? "Starting" : labels[state] ?? "Unknown"
  const tone = failed ? "danger" : normal ? "good" : ["paused", "restarting", "exited", "removing"].includes(state) || health === "starting" ? "warning" : "neutral"
  const description = `${label}: ${status}. Runtime: ${state}. Health check: ${health === "none" ? "not configured" : health}.`
  return <span className={`media-service media-tone-${tone}`} title={description}>
    <StackIcon name={name} /><span className="media-service-name">{label}</span>
    <span className="media-service-dot" aria-hidden="true" />
    {normal ? <span className="media-status-sr"> — {description}</span> : <span className="media-service-state">{status}</span>}
  </span>
}
