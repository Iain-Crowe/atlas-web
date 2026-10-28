import useNow from "../hooks/useNow"

type Reading = { name: string; timestamp?: number | null; maxAge: number; available: boolean }
export default function ReadingSummary({ readings, cadence, error = false }: { readings: Reading[]; cadence: string; error?: boolean }) {
  const now = useNow()
  const ready = readings.filter(reading => reading.timestamp != null && Number.isFinite(reading.timestamp))
  const unavailable = readings.filter(reading => !ready.includes(reading) || !reading.available).map(reading => reading.name)
  const stale = ready.filter(reading => reading.available && (error || now - reading.timestamp! > reading.maxAge || reading.timestamp! > now + 60)).map(reading => reading.name)
  const detail = [cadence, ...ready.map(reading => `${reading.name}: ${new Date(reading.timestamp! * 1000).toLocaleString()}`)].join("\n")
  return <p className="reading-summary" tabIndex={0} data-freshness-detail={detail} title={detail} aria-label={`${unavailable.length || stale.length ? "Telemetry needs attention" : "Readings current"}. ${detail}`}>
    {unavailable.length === 0 && stale.length === 0 && "Readings current"}
    {stale.length > 0 && <span className="reading-summary-warning">Stale: {stale.join(", ")}</span>}
    {unavailable.length > 0 && <span className="reading-summary-warning">{stale.length > 0 ? " · " : ""}Unavailable: {unavailable.join(", ")}</span>}
  </p>
}
