import type { ManagedService } from "../types"

type ServiceCardProps = {
  service: ManagedService
  selected: boolean
  onSelect: (service: ManagedService) => void
}

function getStatusClass(state?: string) {
  switch (state) {
    case "running":
      return "status-running"

    case "exited":
    case "dead":
      return "status-stopped"

    default:
      return "status-unknown"
  }
}

function getStatusLabel(state?: string) {
  switch (state) {
    case "running":
      return "Running"

    case "exited":
    case "dead":
      return "Stopped"

    case "paused":
      return "Paused"

    case "restarting":
      return "Restarting"

    default:
      return "Unknown"
  }
}

function ServiceCard({
  service,
  selected,
  onSelect,
}: ServiceCardProps) {
  return (
    <button
      className={`service-card ${selected ? "selected" : ""}`}
      onClick={() => onSelect(service)}
    >
      <span className="service-name">
        {service.display_name}
      </span>

      <div className="service-status">
        <span
          className={`status-dot ${getStatusClass(
            service.runtime?.state
          )}`}
        />

        <span className="status-text">
          {getStatusLabel(service.runtime?.state)}
        </span>
      </div>
    </button>
  )
}

export default ServiceCard