import "./FreshnessDetails.css"
import useNow from "../hooks/useNow"

export default function Freshness({ timestamp, maxAge = 90, error = false, label = "Updated" }: { timestamp?: number | null; maxAge?: number; error?: boolean; label?: string }) {
  const now = useNow()
  const valid = timestamp != null && Number.isFinite(timestamp)
  const age = valid ? Math.max(0, Math.floor(now - timestamp)) : null
  const stale = error || (age !== null && (age > maxAge || timestamp! > now + 60))
  const detail = valid ? `${label} ${new Date(timestamp * 1000).toLocaleString()}` : "No reading available"
  const text = !valid ? error ? "Unavailable" : "Waiting for data" : stale ? "Stale" : "Live"
  return <span tabIndex={0} data-freshness-detail={detail} className={`freshness ${stale ? "freshness-stale" : ""}`} title={detail} aria-label={`${text}. ${detail}`}>{text}</span>
}
