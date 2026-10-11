import { getStatusClass, getStatusLabel } from "../utils/serviceStatus"
import type { ManagedService } from "../types"

type ServiceCardProps = {
  service: ManagedService
  selected: boolean
  onSelect: (service: ManagedService) => void
}

function ServiceCard({
  service,
  selected,
  onSelect,
}: ServiceCardProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={`service-card ${selected ? "selected" : ""}`}
      onClick={() => onSelect(service)}
    >
      <span className="service-name">
        {service.display_name}
      </span>

      <span className="service-status">
        <span
          className={`status-dot ${getStatusClass(
            service.runtime?.state
          )}`}
        />

        <span className="status-text">
          {getStatusLabel(service.runtime?.state)}
        </span>
      </span>
    </button>
  )
}

export default ServiceCard