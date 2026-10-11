import StatusBanner from "./StatusBanner"
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

  const cpuUsagePercent = status?.cpu.usage_percent == null
    ? null
    : clampPercent(status.cpu.usage_percent)

  const cpuUsageTone = cpuUsagePercent === null ? "neutral" : getUsageTone(cpuUsagePercent)

  const cpuTemperatureTone = status
    ? getTemperatureTone(status.cpu.temperature_c)
    : "neutral"

  const highReadings = status && !error ? [
    ...(cpuUsagePercent !== null && cpuUsagePercent >= 85 ? ["CPU utilization"] : []),
    ...(status.cpu.temperature_c !== null && status.cpu.temperature_c >= 75 ? ["CPU temperature"] : []),
    ...(memoryUsagePercent >= 85 ? ["memory usage"] : []),
    ...(diskUsagePercent >= 85 ? ["disk usage"] : []),
  ] : []
  const uptime = status && Number.isFinite(status.uptime_seconds)
    ? `${Math.floor(status.uptime_seconds / 86400)}d ${Math.floor(status.uptime_seconds % 86400 / 3600)}h uptime`
    : null

  return (
    <section className="panel system-overview">
      <div className="section-heading host-heading"><div><h2>Host Resources</h2><p className="muted">{status?.hostname ?? "Atlas"}{uptime ? ` · ${uptime}` : ""}</p></div><span className="section-meta">5s refresh</span></div>
      {highReadings.length > 0 && <StatusBanner tone="attention" title="Elevated Resource Readings" description={highReadings.join(" · ")} />}

      {loading && <p role="status">Loading system status…</p>}
      {error && <p className="history-warning" role="status">Host readings may be out of date. {error}</p>}

      {status && (
        <div className="system-stats enhanced">
          <div className="telemetry-item">
            <div className="telemetry-head">
              <span>CPU Utilization</span>
              <strong className={`metric-value ${cpuUsageTone}`}>
                {cpuUsagePercent === null ? "Unavailable / warming up" : `${cpuUsagePercent.toFixed(1)}%`}
              </strong>
            </div>

            <div className="meter">
              <div
                className={`meter-fill ${cpuUsageTone}`}
                style={{ width: `${cpuUsagePercent ?? 0}%` }}
              />
            </div>
          </div>

          <div className="telemetry-item">
            <div className="telemetry-head">
              <span>CPU Temperature</span>
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
                {(memoryUsedMb / 1024).toFixed(1)} <small>/ {(status.memory.total_mb / 1024).toFixed(1)} GiB</small>
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
              <span>Data Disk</span>
              <strong
                className={`metric-value ${getUsageTone(
                  diskUsagePercent
                )}`}
              >
                {status.disk.used_gb.toFixed(1)} <small>/ {status.disk.total_gb.toFixed(1)} GB</small>
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
            <span>Load · 1 Minute</span>
            <strong>{status.load_average[0].toFixed(2)}</strong>
          </div>
        </div>
      )}
    </section>
  )
}

export default SystemOverview