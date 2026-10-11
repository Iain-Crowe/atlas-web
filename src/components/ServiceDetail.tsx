import PiHolePanel from "./PiHolePanel"
import JellyfinPanel from "./JellyfinPanel"
import HistoryPanel from "./HistoryPanel"
import type {
  ManagedService,
  MinecraftStatus,
  ServiceAction,
} from "../types"

import {
  getStatusClass,
  getStatusLabel,
} from "../utils/serviceStatus"

type ServiceDetailProps = {
  service: ManagedService | null
  minecraftStatus: MinecraftStatus | null
  minecraftError: string | null
  actionLoading: ServiceAction | null
  actionsDisabled: boolean
  actionError: string | null
  onAction: (action: ServiceAction) => Promise<void>
}

type MetricTone = "good" | "warn" | "danger" | "neutral"

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value))
}

function getTpsTone(tps: number | null): MetricTone {
  if (tps === null) {
    return "neutral"
  }

  if (tps < 18) {
    return "danger"
  }

  if (tps < 19.5) {
    return "warn"
  }

  return "good"
}

function getMsptTone(mspt: number | null): MetricTone {
  if (mspt === null) {
    return "neutral"
  }

  if (mspt >= 45) {
    return "danger"
  }

  if (mspt >= 35) {
    return "warn"
  }

  return "good"
}

function ServiceDetail({
  service,
  minecraftStatus,
  minecraftError,
  actionLoading,
  actionsDisabled,
  actionError,
  onAction,
}: ServiceDetailProps) {
  const selectedState = service?.runtime?.state

  const canStart =
    selectedState === "exited" ||
    selectedState === "dead" ||
    selectedState === "created"

  const canControl = selectedState === "running"

  const tpsTone = minecraftStatus
    ? getTpsTone(minecraftStatus.tps)
    : "neutral"

    const msptTone = minecraftStatus
    ? getMsptTone(minecraftStatus.mspt)
    : "neutral"

    const tpsPercent =
    minecraftStatus?.tps !== null &&
    minecraftStatus?.tps !== undefined
        ? clampPercent((minecraftStatus.tps / 20) * 100)
        : 0

    const msptPercent =
    minecraftStatus?.mspt !== null &&
    minecraftStatus?.mspt !== undefined
        ? clampPercent((minecraftStatus.mspt / 50) * 100)
        : 0

  return (
    <section className="panel service-detail">
      {service ? (
        <>
          <div className="service-detail-header">
            <div>
              <h2>{service.display_name}</h2>

              <div className="service-status detail-status">
                <span
                  className={`status-dot ${getStatusClass(
                    service.runtime?.state
                  )}`}
                />

                <span className="status-text">
                  {getStatusLabel(service.runtime?.state)}
                </span>
              </div>
            </div>

            <div className="service-actions">
              {canStart && (
                <button
                  className="service-action-button primary"
                  disabled={actionsDisabled}
                  onClick={() => onAction("start")}
                >
                  {actionLoading === "start"
                    ? "Starting..."
                    : "Start"}
                </button>
              )}

              {canControl && (
                <>
                  <button
                    className="service-action-button"
                    disabled={actionsDisabled}
                    onClick={() => onAction("restart")}
                  >
                    {actionLoading === "restart"
                      ? "Restarting..."
                      : "Restart"}
                  </button>

                  <button
                    className="service-action-button danger"
                    disabled={actionsDisabled}
                    onClick={() => onAction("stop")}
                  >
                    {actionLoading === "stop"
                      ? "Stopping..."
                      : "Stop"}
                  </button>
                </>
              )}
            </div>
          </div>

          <div className={service.name === "minecraft" ? "service-detail-body has-history" : "service-detail-body"}>
          <div className="service-live-telemetry">
          <div className="detail-grid">
            <div>
              <span>Name</span>
              <strong>{service.name}</strong>
            </div>

            {service.name === "minecraft" &&
              minecraftStatus && (
                <>
                  <div>
                    <span>Players</span>
                    <strong>
                      {minecraftStatus.online} /{" "}
                      {minecraftStatus.max}
                    </strong>
                  </div>

                  <div>
                    <span>Online Players</span>
                    <strong>
                      {minecraftStatus.players.length > 0
                        ? minecraftStatus.players.join(", ")
                        : "None"}
                    </strong>
                  </div>
                  <div className="minecraft-telemetry-section">
                    <p className="detail-section-title">
                        Server Telemetry
                    </p>
                    <div className="minecraft-telemetry">
                        <div className="telemetry-item">
                            <div className="telemetry-head">
                            <span>TPS</span>

                            <strong className={`metric-value ${tpsTone}`}>
                                {minecraftStatus.tps !== null
                                ? minecraftStatus.tps.toFixed(1)
                                : "Unavailable"}
                            </strong>
                            </div>

                            {minecraftStatus.tps !== null && (
                            <div className="meter">
                                <div
                                className={`meter-fill ${tpsTone}`}
                                style={{
                                    width: `${tpsPercent}%`,
                                }}
                                />
                            </div>
                            )}
                        </div>

                        <div className="telemetry-item">
                            <div className="telemetry-head">
                            <span>MSPT</span>

                            <strong className={`metric-value ${msptTone}`}>
                                {minecraftStatus.mspt !== null
                                ? `${minecraftStatus.mspt.toFixed(2)} ms`
                                : "Unavailable"}
                            </strong>
                            </div>

                            {minecraftStatus.mspt !== null && (
                            <div className="meter">
                                <div
                                className={`meter-fill ${msptTone}`}
                                style={{
                                    width: `${msptPercent}%`,
                                }}
                                />
                            </div>
                            )}
                        </div>

                        <div className="telemetry-item chunks-metric">
                            <div className="telemetry-head">
                            <span>Loaded Chunks</span>

                            <strong className="metric-value">
                                {minecraftStatus.loaded_chunks !== null
                                ? minecraftStatus.loaded_chunks.toLocaleString()
                                : "Unavailable"}
                            </strong>
                            </div>
                        </div>
                        </div>
                    </div>
                </>
              )}
          </div>

          {minecraftError && <p className="history-warning" role="status">{minecraftError}</p>}
          </div>
          {service.name === "minecraft" && <HistoryPanel key={service.id} kind="minecraft" serviceId={service.id} />}
          </div>

          {service.name === "jellyfin" && <JellyfinPanel key={service.id} serviceId={service.id} />}
          {service.name === "pihole" && <PiHolePanel key={service.id} serviceId={service.id} />}

          {actionError && (
            <p className="action-error" role="alert">
              {actionError}
            </p>
          )}
        </>
      ) : (
        <div className="empty-state">
          <h2>Service Details</h2>
          <p>Select a service to view details.</p>
        </div>
      )}
    </section>
  )
}

export default ServiceDetail