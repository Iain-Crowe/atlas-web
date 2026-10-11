import useNow from "../hooks/useNow"

export default function Freshness({ timestamp, maxAge = 90, error = false, label = "Updated" }: { timestamp?: number | null; maxAge?: number; error?: boolean; label?: string }) {
  const now = useNow()
  const age = timestamp == null ? null : Math.max(0, Math.floor(now - timestamp))
  const stale = error || (age !== null && age > maxAge)
  const elapsed = age === null ? "" : age < 60 ? `${age}s` : age < 3600 ? `${Math.floor(age / 60)}m` : `${Math.floor(age / 3600)}h`
  return <span className={`freshness ${stale ? "freshness-stale" : ""}`} title={timestamp == null ? undefined : new Date(timestamp * 1000).toLocaleString()}>{age === null ? error ? "Unavailable" : "Waiting for Data" : `${stale ? "Stale · " : ""}${label} ${elapsed} ago`}</span>
}
