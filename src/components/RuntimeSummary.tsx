import type { ManagedService } from "../types"
import StatusBanner from "./StatusBanner"

type Props = { services: ManagedService[]; loading: boolean; error: string | null }

export default function RuntimeSummary({ services, loading, error }: Props) {
  const running = services.filter(service => service.runtime?.state === "running").length
  const stopped = services.filter(service => ["exited", "dead", "created"].includes(service.runtime?.state ?? "")).length
  const other = services.length - running - stopped
  const known = !loading && !error && services.length > 0
  const allRunning = known && running === services.length
  return <section className="panel runtime-summary" aria-label="Service runtime summary">
    <StatusBanner tone={!known ? "unavailable" : allRunning ? "good" : "attention"}
      title={error ? "Service status unavailable" : loading ? "Checking service status" : services.length === 0 ? "No managed services" : allRunning ? "All managed services are running" : `${services.length - running} ${services.length - running === 1 ? "service is" : "services are"} not running`}
      description={error ? "The last reading could not be refreshed." : loading ? "Waiting for the first reading." : `${services.length} registered services · Container runtime status`}>
      <dl className="runtime-counts">
        <div><dt>Running</dt><dd>{known ? running : "—"}</dd></div>
        <div><dt>Stopped</dt><dd>{known ? stopped : "—"}</dd></div>
        <div><dt>Other states</dt><dd>{known ? other : "—"}</dd></div>
      </dl>
    </StatusBanner>
  </section>
}
