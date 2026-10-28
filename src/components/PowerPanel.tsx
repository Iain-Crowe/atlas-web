import { useState } from 'react'
import { apiFetch } from '../api'
import usePolling from '../hooks/usePolling'
import './PowerPanel.css'

type Day = { day: string; kwh: number | null; cost: number | null; coverage: number; battery_kwh: number | null; utility_kwh: number | null; unknown_kwh: number | null; covered_seconds: number; partial: boolean }
type Average = { included_days: number; window_days: number; coverage: number; kwh: number | null; cost: number | null }
type Power = {
  communication: string; current_watts: number | null; as_of: number; last_success_at: number | null;
  latest: { status: string; supply: string; load: number; charge: number | null; runtime: number | null; voltage: number | null; nominal_watts: number | null } | null;
  settings: { rate: number; rated_watts: number; note: string; equipment: string } | null;
  settings_effective_at: number | null; days: Day[]; averages: Record<string, Average>;
}
const value = (n: number | null | undefined, digits = 2) => n == null ? '—' : n.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })
const money = (n: number | null | undefined) => n == null ? '—' : `$${n.toFixed(3)}`
const percent = (n: number) => `${(100 * n).toFixed(1)}%`
const stamp = (n: number | null | undefined) => n == null ? 'No successful reading yet' : new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/New_York' }).format(new Date(n * 1000)) + ' Eastern'

export default function PowerPanel({ compact = false, onOpen }: { compact?: boolean; onOpen?: () => void }) {
  const [range, setRange] = useState(30)
  const [metric, setMetric] = useState<'kwh' | 'cost'>('kwh')
  const [selected, setSelected] = useState<string | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const { data, error, loading } = usePolling<Power>(`/power/history?days=${compact ? 1 : range}`, true, 30000)
  const current = !error && data?.communication === 'current'
  const today = data?.days.at(-1)
  const detail = data?.days.find(day => day.day === selected) ?? today
  const maximum = Math.max(.001, ...(data?.days.map(day => day[metric] ?? 0) ?? []))
  async function download() {
    setExporting(true); setExportError(null)
    const controller = new AbortController()
    const timer = window.setTimeout(() => controller.abort(), 12000)
    try {
      const response = await apiFetch(`/power/export.csv?days=${range}`, { signal: controller.signal })
      if (!response.ok) throw new Error('Export could not be downloaded.')
      const url = URL.createObjectURL(await response.blob())
      const link = document.createElement('a'); link.href = url; link.download = 'atlas-power-estimates.csv'; link.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch { setExportError('Export unavailable. Please try again.') }
    finally { window.clearTimeout(timer); setExporting(false) }
  }
  return <section className={`panel power-panel ${compact ? 'power-compact' : ''}`} aria-label="UPS power estimates">
    <div className="section-heading"><div><span className="eyebrow">UPS-connected equipment</span><h2>Power Estimates</h2></div>
      {compact ? <button className="text-button" onClick={onOpen}>View power →</button> : <span className="power-state">{current ? data?.latest?.supply === 'battery' ? 'On battery' : data?.latest?.supply === 'utility' ? 'Utility power' : 'Supply state unknown' : 'Readings unavailable'}</span>}
    </div>
    {!data ? <p className="muted" role="status">{loading ? 'Loading power readings…' : 'Power history is not available yet.'}</p> : <>
      <dl className="power-metrics">
        <div><dt>Estimated current load</dt><dd>{value(current ? data.current_watts : null, 0)} <small>W</small></dd><span className="muted">{current ? data.latest?.status : 'Awaiting current reading'}</span></div>
        <div><dt>{current ? 'Today' : today?.day} · estimated energy</dt><dd>{value(today?.kwh, 3)} <small>kWh</small></dd><span className="muted">Observed intervals only</span></div>
        <div><dt>Estimated utility cost</dt><dd>{money(today?.cost)}</dd><span className="muted">Battery intervals excluded</span></div>
        <div><dt>Coverage through last collection</dt><dd>{today ? percent(today.coverage) : '—'}</dd><span className="muted">{current ? 'Readings current' : 'Last recorded totals'}</span></div>
      </dl>
      {!compact && <>
        <p className="power-explanation">Estimates use UPS load % × the configured rated capacity ({value(data.settings?.rated_watts, 0)} W); the load percentage’s physical basis is unverified. These are equipment-load estimates, not measured wall energy or household billing. UPS overhead and battery charging are excluded. Cost values only utility-state energy at the rate effective when collected. Gaps are uncounted, never zero-filled or projected.</p>
        <div className="power-toolbar"><label>Daily history <select value={range} onChange={event => { setRange(Number(event.target.value)); setSelected(null) }}><option value={7}>7 days</option><option value={30}>30 days</option><option value={90}>90 days</option></select></label><label>Chart <select value={metric} onChange={event => setMetric(event.target.value as 'kwh' | 'cost')}><option value="kwh">Energy (kWh)</option><option value="cost">Utility cost ($)</option></select></label><button className="text-button" disabled={exporting} onClick={() => void download()}>{exporting ? 'Exporting…' : 'Export CSV'}</button></div>
        {exportError && <p className="muted" role="status">{exportError}</p>}
        <div className="power-chart" role="group" aria-label="Daily estimated energy. Select a day for energy, cost and coverage.">
          {data.days.map(day => <button key={day.day} type="button" className={`power-bar ${day.kwh == null ? 'power-gap' : ''}`} aria-pressed={detail?.day === day.day} onClick={() => setSelected(day.day)} title={`${day.day}: ${value(day.kwh, 3)} kWh; ${money(day.cost)}; ${percent(day.coverage)} coverage`} aria-label={`${day.day}, estimated ${value(day.kwh, 3)} kWh, utility cost ${money(day.cost)}, ${percent(day.coverage)} coverage${day.partial ? ', partial day' : ''}`}><span style={{ height: day[metric] == null ? '0%' : `${Math.max(1, (day[metric] ?? 0) / maximum * 100)}%` }} /></button>)}
        </div>
        <div className="power-chart-axis"><span>{data.days[0]?.day}</span><span>{metric === 'kwh' ? 'Estimated kWh' : 'Estimated utility cost ($)'} · select a day</span><span>{today?.day}</span></div>
        {detail && <div className="power-day-detail" aria-live="polite"><strong>{detail.day}{detail.partial ? ' · Partial day' : ''}</strong><span>{value(detail.kwh, 3)} estimated kWh · {money(detail.cost)} utility cost</span><span>{percent(detail.coverage)} coverage · {value(detail.battery_kwh, 3)} battery kWh · {value(detail.unknown_kwh, 3)} unknown-supply kWh</span></div>}
        <div className="power-averages">{['7', '30'].map(key => { const average = data.averages[key]; return average && <div key={key}><h3>{key}-day daily average</h3><strong>{value(average.kwh, 3)} <small>kWh</small> · {money(average.cost)}</strong><p className="muted">{average.included_days} of {key} completed days included · {percent(average.coverage)} window coverage</p></div> })}</div>
        <p className="muted">Averages include only completed Eastern days with at least 95% coverage. They average recorded totals without filling gaps. Today and missing days are excluded; no history is reconstructed.</p>
        <details className="power-details"><summary>Readings, assumptions & accounting</summary>
          <dl><dt>Equipment scope</dt><dd>{data.settings?.equipment}</dd><dt>Planning tariff</dt><dd>${value(data.settings?.rate, 2)}/kWh · {data.settings?.note}</dd><dt>Settings effective</dt><dd>{stamp(data.settings_effective_at)}</dd><dt>Latest successful UPS reading</dt><dd>{stamp(data.last_success_at)}</dd><dt>Totals as of</dt><dd>{stamp(data.as_of)}</dd><dt>Last UPS status / load</dt><dd>{data.latest?.status ?? '—'} / {value(data.latest?.load, 0)}%</dd><dt>Battery / estimated runtime</dt><dd>{value(data.latest?.charge, 0)}% / {value(data.latest?.runtime == null ? null : data.latest.runtime / 60, 0)} min</dd><dt>Input voltage / reported nominal power</dt><dd>{value(data.latest?.voltage, 1)} V / {value(data.latest?.nominal_watts, 0)} W</dd></dl>
          <p>30-second sampling. Trapezoidal integration bridges at most 75 seconds between valid consecutive readings with unchanged status and settings. Clock jumps, restarts and failed reads break integration. Days use America/New_York, including 23/25-hour DST days. Raw readings: 35 days; daily accounting: 400 days; Console/export: up to 90 days. Settings are managed on Atlas and take effect at the first accepted sample; historical estimates retain their original assumptions.</p>
        </details>
      </>}
      <p className="power-footnote muted">{compact ? 'Estimates · ' : ''}Last successful reading: {stamp(data.last_success_at)}{error ? ' · Refresh unavailable; showing retained data.' : ''}</p>
    </>}
  </section>
}
