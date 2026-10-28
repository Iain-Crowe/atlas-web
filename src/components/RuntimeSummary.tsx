import { ServiceIcon } from "./ServiceIdentity"
import { serviceIssue, serviceLabel } from "../utils/serviceStatus"
import Freshness from "./Freshness"
import useNow from "../hooks/useNow"
import type { ManagedService } from "../types"
import StatusBanner from "./StatusBanner"

type Props = { updatedAt: number | null; services: ManagedService[]; loading: boolean; error: string | null; onSelect: (service: ManagedService) => void }

export default function RuntimeSummary({ services, loading, error, updatedAt, onSelect }: Props) {
  const now = useNow()
  const running = services.filter(service => service.runtime?.state === "running").length
  const known = !loading && !error && services.length > 0
  const issues = services.flatMap(service => {
    const label = serviceIssue(service, now)
    return label ? [{ service, label }] : []
  })
  const incomplete = services.some(service => ["Status Stale", "Status Unavailable"].includes(serviceLabel(service, now)))
  return <section className="panel runtime-summary" aria-label="Service runtime summary">
    <StatusBanner tone={!known ? "unavailable" : issues.length ? "attention" : "good"}
      title={error ? "Service Status Unavailable" : loading ? "Checking Services" : services.length === 0 ? "No Managed Services" : issues.length ? `${issues.length} ${issues.length === 1 ? "Service Needs" : "Services Need"} Attention` : incomplete ? "No Service Faults Reported" : "Services Operational"}>
      <dl className="runtime-counts">
        <div><dt>Running</dt><dd>{known ? running : "—"}<small> / {services.length}</small></dd></div>
        <div><dt>Attention</dt><dd>{known ? issues.length : "—"}</dd></div>
      </dl>
    </StatusBanner>
    {known && issues.length > 0 && <ul className="runtime-issues" aria-label="Services Requiring Attention">
      {issues.map(({ service, label }) => <li key={service.id}>
        <button type="button" className="runtime-issue" onClick={() => onSelect(service)}>
          <span className="runtime-issue-name"><ServiceIcon name={service.name} /><span>{service.display_name}</span></span>
          <span className="runtime-issue-state"><span className="runtime-issue-dot" aria-hidden="true" />{label} →</span>
        </button>
      </li>)}
    </ul>}
    <Freshness timestamp={updatedAt} maxAge={20} error={!!error} />
  </section>
}
