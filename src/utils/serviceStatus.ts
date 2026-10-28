import type { ManagedService } from "../types"
export function getStatusClass(state?: string): string {
  switch (state) {
    case "running":
      return "status-running"

    case "exited":
    case "dead":
      return "status-stopped"

    case "paused":
    case "restarting":
      return "status-attention"

    default:
      return "status-unknown"
  }
}

export function getStatusLabel(state?: string): string {
  switch (state) {
    case "running":
      return "Running"

    case "exited":
    case "dead":
      return "Stopped"

    case "created":
      return "Created"

    case "paused":
      return "Paused"

    case "restarting":
      return "Restarting"

    default:
      return "Status Unavailable"
  }
}

export function serviceLabel(service: ManagedService, now: number): string {
  if (service.statusError || service.statusUpdatedAt == null || now - service.statusUpdatedAt > 20) return "Status Stale"
  if (service.node_id === "cronus-jellyfin" && service.resources?.observed_at && now - service.resources.observed_at > 60) return "Status Stale"
  const state = service.runtime?.state
  if (state !== "running") return getStatusLabel(state)
  const row = service.resources
  if (row?.observed_at && now - row.observed_at <= (service.node_id === "cronus-jellyfin" ? 60 : 20) && !service.resourcesError && row.state === 'running') {
    if (row.health === 'starting') return 'Starting'
    if (row.health === 'unhealthy') return 'Unhealthy'
  }
  return 'Running'
}

/** Resource freshness is informational for the remote Jellyfin workload. */
export function serviceIssue(service: ManagedService, now: number): string | null {
  const label = serviceLabel(service, now)
  if (service.node_id === "cronus-jellyfin") {
    return ["Running", "Status Stale", "Status Unavailable"].includes(label) ? null : label
  }
  if (label !== "Running") return label
  const row = service.resources
  if (service.resourcesError || !row || row.telemetry !== "ready" || row.sampled_at == null || now - row.sampled_at > 20 || row.observed_at == null || now - row.observed_at > 20) {
    return row?.sampled_at == null ? "Telemetry Unavailable" : "Telemetry Stale"
  }
  return null
}
