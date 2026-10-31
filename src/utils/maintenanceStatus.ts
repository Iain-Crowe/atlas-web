export type MaintenanceStatus = {
  version: 1; node: "atlas"; enabled: boolean; simulation: boolean
  phase: "idle" | "scheduled" | "running" | "complete" | "failed" | "skipped"
  updated_at: string; scheduled_for: string | null; message: string
  pending_updates: number | null; reboot_required: boolean | null
}
export function maintenancePresentation(status: MaintenanceStatus | null, error: boolean, now: number) {
  if (error) return { label: "Status unavailable", tone: "warn", stale: true }
  if (!status) return { label: "Not configured", tone: "neutral", stale: false }
  const age = now - Date.parse(status.updated_at) / 1000
  if (!Number.isFinite(age) || age > 180 || age < -60) return { label: "Status stale", tone: "warn", stale: true }
  if (status.simulation) return { label: "Test mode", tone: "neutral", stale: false }
  if (status.phase === "failed") return { label: "Needs attention", tone: "danger", stale: false }
  if (status.phase === "running") return { label: "In progress", tone: "warn", stale: false }
  if (!status.enabled) return { label: "Disabled", tone: "neutral", stale: false }
  if (status.phase === "scheduled") {
    const until = status.scheduled_for ? Date.parse(status.scheduled_for) / 1000 - now : NaN
    return { label: Number.isFinite(until) && until >= 0 && until <= 900 ? "Starting soon" : "Scheduled", tone: Number.isFinite(until) && until <= 900 ? "warn" : "info", stale: false }
  }
  if (status.phase === "skipped") return { label: "Window skipped", tone: "neutral", stale: false }
  if (status.phase === "complete") return { label: "Complete", tone: "neutral", stale: false }
  return { label: "No downtime scheduled", tone: "neutral", stale: false }
}
