import type { SystemStatus } from "../types"

type SystemOverviewProps = {
  status: SystemStatus | null
  loading: boolean
  error: string | null
}

type MetricTone = "good" | "warn" | "danger" | "neutral"

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value))
}

function getUsagePercent(used: number, total: number): number {
  if (total <= 0) {
    return 0
  }

  return clampPercent((used / total) * 100)
}

function getUsageTone(percent: number): MetricTone {
  if (percent >= 85) {
    return "danger"
  }

  if (percent >= 60) {
    return "warn"
  }

  return "good"
}

function getTemperatureTone(temp: number | null): MetricTone {
  if (temp === null) {
    return "neutral"
  }

  if (temp >= 75) {
    return "danger"
  }

  if (temp >= 60) {
    return "warn"
  }

  return "good"
}

function SystemOverview({
  status,
  loading,
  error,
}: SystemOverviewProps) {
  const memoryUsedMb = status
    ? status.memory.total_mb - status.memory.available_mb
    : 0

  const memoryUsagePercent = status
    ? getUsagePercent(memoryUsedMb, status.memory.total_mb)
    : 0

  const diskUsagePercent = status
    ? getUsagePercent(status.disk.used_gb, status.disk.total_gb)
    : 0

  const cpuUsagePercent = status
    ? clampPercent(status.cpu.usage_percent)
    : 0

  const cpuUsageTone = getUsageTone(cpuUsagePercent)

  const cpuTemperatureTone = status
    ? getTemperatureTone(status.cpu.temperature_c)
    : "neutral"

  return (
    <section className="panel system-overview">
      <h2>System Overview</h2>

      {loading && <p>Loading system status...</p>}
      {error && <p>{error}</p>}

      {status && (
        <div className="system-stats enhanced">
          <div className="stat-row host-row">
            <span>Host</span>
            <strong>{status.hostname}</strong>
          </div>

          <div className="telemetry-item">
            <div className="telemetry-head">
              <span>CPU</span>
              <strong className={`metric-value ${cpuUsageTone}`}>
                {cpuUsagePercent.toFixed(1)}%
              </strong>
            </div>

            <div className="meter">
              <div
                className={`meter-fill ${cpuUsageTone}`}
                style={{ width: `${cpuUsagePercent}%` }}
              />
            </div>
          </div>

          <div className="telemetry-item">
            <div className="telemetry-head">
              <span>Temperature</span>
              <strong
                className={`metric-value ${cpuTemperatureTone}`}
              >
                {status.cpu.temperature_c !== null
                  ? `${status.cpu.temperature_c.toFixed(0)}°C`
                  : "Unavailable"}
              </strong>
            </div>

            {status.cpu.temperature_c !== null && (
              <div className="meter">
                <div
                  className={`meter-fill ${cpuTemperatureTone}`}
                  style={{
                    width: `${clampPercent(
                      ((status.cpu.temperature_c - 25) /
                        (80 - 25)) *
                        100
                    )}%`,
                  }}
                />
              </div>
            )}
          </div>

          <div className="telemetry-item">
            <div className="telemetry-head">
              <span>Memory</span>
              <strong
                className={`metric-value ${getUsageTone(
                  memoryUsagePercent
                )}`}
              >
                {memoryUsedMb.toFixed(0)} /{" "}
                {status.memory.total_mb.toFixed(0)} MB
              </strong>
            </div>

            <div className="meter">
              <div
                className={`meter-fill ${getUsageTone(
                  memoryUsagePercent
                )}`}
                style={{ width: `${memoryUsagePercent}%` }}
              />
            </div>
          </div>

          <div className="telemetry-item">
            <div className="telemetry-head">
              <span>Disk</span>
              <strong
                className={`metric-value ${getUsageTone(
                  diskUsagePercent
                )}`}
              >
                {status.disk.used_gb.toFixed(1)} /{" "}
                {status.disk.total_gb.toFixed(1)} GB
              </strong>
            </div>

            <div className="meter">
              <div
                className={`meter-fill ${getUsageTone(
                  diskUsagePercent
                )}`}
                style={{ width: `${diskUsagePercent}%` }}
              />
            </div>
          </div>

          <div className="stat-row">
            <span>Load</span>
            <strong>{status.load_average[0].toFixed(2)}</strong>
          </div>
        </div>
      )}
    </section>
  )
}

export default SystemOverview