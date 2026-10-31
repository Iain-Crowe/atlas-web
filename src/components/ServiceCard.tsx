import ServiceResources from "./ServiceResources"
import useNow from "../hooks/useNow"
import { getStatusClass, serviceLabel } from "../utils/serviceStatus"
import { ServiceIcon } from "./ServiceIdentity"
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
  const now = useNow()
  const label = serviceLabel(service, now)
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={`service-card ${selected ? "selected" : ""}`}
      onClick={() => onSelect(service)}
    >
      <span className="service-name service-card-name">
        <ServiceIcon name={service.name} />
        {service.display_name}
      </span>

      <span className="service-status">
        <span
          className={`status-dot ${getStatusClass(
            label === "Running" ? "running" : ["Starting", "Unhealthy", "Status Stale"].includes(label) ? "restarting" : service.runtime?.state
          )}`}
        />

        <span className="status-text">
          {label}
        </span>
      </span>
      <span className="minecraft-card-target" >{service.name === "minecraft" ? service.runtime_name === "minecraft-craftbox" ? "Craftbox" : "Primary Server" : service.node_label ?? "Atlas"}</span>
      <ServiceResources service={service} />
    </button>
  )
}

export default ServiceCard