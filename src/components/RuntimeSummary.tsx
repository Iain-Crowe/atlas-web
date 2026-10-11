import Freshness from "./Freshness"
import type { ManagedService } from "../types"
import StatusBanner from "./StatusBanner"

type Props = { updatedAt: number | null; services: ManagedService[]; loading: boolean; error: string | null }

export default function RuntimeSummary({ services, loading, error, updatedAt }: Props) {
  const running = services.filter(service => service.runtime?.state === "running").length
  const stopped = services.filter(service => ["exited", "dead", "created"].includes(service.runtime?.state ?? "")).length
  const other = services.length - running - stopped
  const known = !loading && !error && services.length > 0
  const allRunning = known && running === services.length
  return <section className="panel runtime-summary" aria-label="Service runtime summary">
    <StatusBanner tone={!known ? "unavailable" : allRunning ? "good" : "attention"}
      title={error ? "Service Status Unavailable" : loading ? "Checking Service Status" : services.length === 0 ? "No Managed Services" : allRunning ? "All Managed Services Are Running" : `${services.length - running} ${services.length - running === 1 ? "Service Is" : "Services Are"} Not Running`}
      description={error ? "The last reading could not be refreshed." : loading ? "Waiting for the first reading." : `${services.length} registered services · Container runtime status`}>
      <dl className="runtime-counts">
        <div><dt>Running</dt><dd>{known ? running : "—"}</dd></div>
        <div><dt>Stopped</dt><dd>{known ? stopped : "—"}</dd></div>
        <div><dt>Other States</dt><dd>{known ? other : "—"}</dd></div>
      </dl>
    </StatusBanner>
    {known && !allRunning && <p className="history-warning">{services.filter(service => service.runtime?.state !== "running").map(service => `${service.display_name}: ${service.runtime?.state ?? "unknown"}`).join(" · ")}</p>}
    <Freshness timestamp={updatedAt} maxAge={20} error={!!error} />
  </section>
}
