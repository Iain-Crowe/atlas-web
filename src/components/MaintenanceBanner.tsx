import usePolling from "../hooks/usePolling"
import useNow from "../hooks/useNow"
import { maintenancePresentation, type MaintenanceStatus } from "../utils/maintenanceStatus"
import "./MaintenanceBanner.css"

type Snapshot = { ok: true; configured: boolean; status: MaintenanceStatus | null }

export default function MaintenanceBanner() {
  const { data, loading, error } = usePolling<Snapshot>("/maintenance/status", true, 30000)
  const now = useNow()
  const status = data?.configured ? data.status : null
  const presentation = maintenancePresentation(status, !!error, now)
  const label = loading && !data ? "Checking…" : presentation.label
  const scheduled = status?.scheduled_for ? Date.parse(status.scheduled_for) : NaN
  const windowLabel = Number.isFinite(scheduled) ? new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short",
  }).format(scheduled) : null
  return <details className={`maintenance-control maintenance-${presentation.tone}`} onKeyDown={event => {
    if (event.key === "Escape") { event.currentTarget.open = false; event.currentTarget.querySelector("summary")?.focus() }
  }}>
    <summary><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M8 3v4m8-4v4M4 10h16m-12 4h3m2 0h3" /></svg><span>Maintenance</span><span className="maintenance-label" role="status">{label}</span><span className="maintenance-chevron" aria-hidden="true">⌄</span></summary>
    <div className="maintenance-popover">
      <h2>Automatic Maintenance</h2>
      {presentation.stale && <p className="maintenance-warning">The schedule cannot currently be verified. Any details below are the last reported state.</p>}
      {status ? <>
        <p>{status.message}</p>
        <dl>
          {windowLabel && <div><dt>{presentation.stale ? "Last reported window" : "Window"}</dt><dd>{windowLabel}</dd></div>}
          {status.pending_updates !== null && <div><dt>Pending updates</dt><dd>{status.pending_updates}</dd></div>}
          {status.reboot_required !== null && <div><dt>Reboot required</dt><dd>{status.reboot_required ? "Yes" : "No"}</dd></div>}
        </dl>
        {status.simulation && <p>Test only. No updates or reboots will run.</p>}
        <small>Atlas + Cronus VM · Schedule shown in Eastern time</small>
      </> : <p>{error ? "Maintenance telemetry is unavailable." : loading ? "Checking the scheduler…" : "Automatic maintenance is not configured."}</p>}
    </div>
  </details>
}
