import PowerPanel from "./components/PowerPanel"
import NodesPanel from "./components/NodesPanel"
import MaintenanceBanner from "./components/MaintenanceBanner"
import SessionPrompt from "./components/SessionPrompt"
import { isMinecraftService } from "./utils/minecraft"
import { getStatusLabel } from "./utils/serviceStatus"
import ConfirmServiceAction from "./components/ConfirmServiceAction"
import Freshness from "./components/Freshness"
import { useEffect, useRef, useState } from "react"
import "./App.css"
import "./components/ServicePanels.css"
import { apiFetch } from "./api"
import LoginView from "./LoginView"
import { ServiceIcon } from "./components/ServiceIdentity"
import RuntimeSummary from "./components/RuntimeSummary"
import MediaPanel from "./components/MediaPanel"
import NetworkPanel from "./components/NetworkPanel"
import HistoryPanel from "./components/HistoryPanel"
import SystemOverview from "./components/SystemOverview"
import ServiceCard from "./components/ServiceCard"
import ServiceDetail from "./components/ServiceDetail"
import useAuth from "./hooks/useAuth"
import useSystemStatus from "./hooks/useSystemStatus"
import useServices from "./hooks/useServices"
import useMinecraftStatus from "./hooks/useMinecraftStatus"
import type { ManagedService, ServiceAction } from "./types"

const views = {
  overview: { label: "Overview", description: "Your nodes and managed services at a glance." },
  services: { label: "Services", description: "Inspect workloads, view telemetry, and manage runtime state." },
  network: { label: "Network", description: "Host traffic, service bandwidth, and connection quality." },
  power: { label: "Power", description: "UPS-connected equipment energy and cost estimates." },
  history: { label: "History", description: "Explore host measurements over time." },
} as const

type View = keyof typeof views
type PendingAction = { serviceId: number; action: ServiceAction }

function savedNavigation(): { view: View; selection: number | "media" | null } {
  try {
    const value = JSON.parse(sessionStorage.getItem("atlas.navigation") ?? "null")
    if (value && Object.prototype.hasOwnProperty.call(views, value.view)) return { view: value.view, selection: value.selection === "media" || Number.isInteger(value.selection) ? value.selection : null }
  } catch { /* Storage may be disabled or contain an older format. */ }
  return { view: "overview", selection: null }
}

function Console({ logout }: { logout: () => void }) {
  const authenticated = true
  const { systemStatus, systemLoading, systemError, systemUpdatedAt } = useSystemStatus(authenticated)
  const { services, servicesLoading, servicesError, refreshServices, servicesUpdatedAt } = useServices(authenticated)
  const [view, setView] = useState<View>(() => savedNavigation().view)
  const [selection, setSelection] = useState<number | "media" | null>(() => savedNavigation().selection)
  const [minecraftChoice, setMinecraftChoice] = useState<number | null>(() => {
    try { const value = Number(sessionStorage.getItem("atlas.minecraftChoice")); return Number.isInteger(value) && value > 0 ? value : null } catch { return null }
  })
  const minecraftServers = services.filter(isMinecraftService)
  const minecraftTarget = minecraftServers.find(service => service.id === selection) ?? minecraftServers.find(service => service.id === minecraftChoice) ?? minecraftServers[0]
  const firstMinecraftId = minecraftServers[0]?.id
  const navigationServices = services.flatMap(service => !isMinecraftService(service) ? [service] : service.id === firstMinecraftId && minecraftTarget ? [minecraftTarget] : [])
  const navigationCard = (service: ManagedService): ManagedService => isMinecraftService(service) ? { ...service, name: "minecraft", display_name: "Minecraft" } : service
  const selectedService = services.find(service => service.id === selection) ?? null
  const { minecraftStatus, minecraftError, minecraftUpdatedAt } = useMinecraftStatus(authenticated && view === "services", selectedService)
  const [pending, setPending] = useState<PendingAction | null>(null)
  const [actionError, setActionError] = useState<{ serviceId: number; message: string } | null>(null)
  const [confirmation, setConfirmation] = useState<{ service: ManagedService; action: ServiceAction } | null>(null)
  const [notice, setNotice] = useState<{ message: string; error: boolean } | null>(null)
  useEffect(() => { try { sessionStorage.setItem("atlas.navigation", JSON.stringify({ view, selection })) } catch { /* Optional persistence. */ } }, [view, selection])
  const actionInFlight = useRef(false)
  const session = useRef(0)

  function handleLogout() {
    try { sessionStorage.removeItem("atlas.navigation") } catch { /* Optional persistence. */ }
    session.current += 1
    logout()
    setSelection(null)
    setView("overview")
    setActionError(null)
    setPending(null)
  }

  function handleMinecraftChoice(id: number) {
    setMinecraftChoice(id)
    try { sessionStorage.setItem("atlas.minecraftChoice", String(id)) } catch { /* Optional persistence. */ }
    setSelection(id)
    setActionError(null)
  }

  function handleSelectService(service: ManagedService) {
    setSelection(service.id)
    setActionError(null)
    setView("services")
  }

  async function requestServiceAction(action: ServiceAction) {
    if (!selectedService || actionInFlight.current || servicesError) return
    if (action !== "start") { setConfirmation({ service: selectedService, action }); return }
    await handleServiceAction(action, selectedService)
  }

  async function handleServiceAction(action: ServiceAction, service: ManagedService) {
    if (actionInFlight.current || servicesError) return
    const currentState = services.find(item => item.id === service.id)?.runtime?.state
    if (action === "start" ? !["exited", "dead", "created"].includes(currentState ?? "") : currentState !== "running") return
    const serviceId = service.id
    const currentSession = session.current
    actionInFlight.current = true
    setConfirmation(null)
    setNotice(null)
    setPending({ serviceId, action })
    setActionError(null)
    try {
      const response = await apiFetch(`/services/${serviceId}/${action}`, { method: "POST" })
      if (!response.ok) {
        const data: unknown = await response.json().catch(() => null)
        const detail = data && typeof data === "object" && "detail" in data ? data.detail : null
        throw new Error(typeof detail === "string" ? detail : `Request failed (${response.status})`)
      }
      if (session.current === currentSession) {
        try {
          const refreshed = await refreshServices()
          const state = refreshed.find(item => item.id === serviceId)?.runtime?.state ?? "unknown"
          if (session.current === currentSession) setNotice({ error: false, message: `${service.display_name}: ${action} request accepted. Latest runtime state: ${state}.` })
        } catch {
          throw new Error("Action accepted, but status could not be refreshed. Check the service before retrying.")
        }
      }
    } catch (error) {
      if (session.current === currentSession) {
        const message = error instanceof Error ? error.message : `Failed to ${action} service`
        setActionError({ serviceId, message })
        setNotice({ error: true, message: `${service.display_name}: ${message}` })
      }
    } finally {
      actionInFlight.current = false
      if (session.current === currentSession) setPending(null)
    }
  }


  const running = services.filter(service => service.runtime?.state === "running").length
  const serviceFeedback = <>
    {servicesLoading && <p role="status" className="muted">Loading services…</p>}
    {servicesError && <p role="status" className="history-warning">Service status could not be refreshed. Displayed states may be out of date. {servicesError}</p>}
    {!servicesLoading && !servicesError && services.length === 0 && <p className="muted">No managed services are registered yet.</p>}
  </>

  return <div className="app-shell">
    <a className="skip-link" href="#main-content">Skip to content</a>
    <header className="topbar">
      <div className="brand-group">
        <div className="brand-logo-wrap"><img src="/atlas-logo.png" alt="" className="brand-logo" /></div>
        <div><p className="brand">Atlas</p><p className="subtitle">SYSTEMS / CONTROL</p></div>
      </div>
      <button className="logout-button" onClick={handleLogout}>Sign out</button>
    </header>
    <nav className="primary-nav" aria-label="Main navigation">
      {(Object.keys(views) as View[]).map(key => <button key={key} type="button" aria-current={view === key ? "page" : undefined} onClick={() => setView(key)}>{views[key].label}</button>)}
    </nav>
    {confirmation && <ConfirmServiceAction name={confirmation.service.display_name} action={confirmation.action}
      disabled={!!servicesError || pending !== null || services.find(item => item.id === confirmation.service.id)?.runtime?.state !== "running"}
      onCancel={() => setConfirmation(null)} onConfirm={() => void handleServiceAction(confirmation.action, confirmation.service)} />}
    <main id="main-content" tabIndex={-1}>
      <div className="page-heading"><div><span className="page-index" aria-hidden="true">0{(Object.keys(views) as View[]).indexOf(view) + 1} / ATLAS</span><h1>{views[view].label}</h1></div><div className="page-heading-tools"><span className="host-label">{systemStatus?.hostname ?? "Atlas host"}</span><MaintenanceBanner /></div></div>
      {notice && <div className={`action-notice ${notice.error ? "history-warning" : ""}`}><p role={notice.error ? "alert" : "status"}>{notice.message}</p><button className="text-button" onClick={() => setNotice(null)} aria-label="Dismiss action feedback">Dismiss</button></div>}
      {view === "overview" && <div className="overview-layout">
        <RuntimeSummary onSelect={handleSelectService} updatedAt={servicesUpdatedAt} services={services} loading={servicesLoading} error={servicesError} />
        <SystemOverview updatedAt={systemUpdatedAt} status={systemStatus} loading={systemLoading} error={systemError} />
        <NodesPanel />
        <PowerPanel compact onOpen={() => setView("power")} />
        <section className="panel overview-service-panel">
          <div className="section-heading"><div><h2>Managed Services</h2><p className="muted">{servicesError ? "Status refresh unavailable" : servicesLoading ? "Checking runtime status…" : `${running} of ${services.length} Containers Running · ${navigationServices.length} Service Groups`}</p></div><button className="text-button" onClick={() => setView("services")}>View services →</button></div>
          {serviceFeedback}
          <div className="overview-services">{navigationServices.map(service => <ServiceCard key={service.id} service={navigationCard(service)} selected={false} onSelect={handleSelectService} />)}</div>
        </section>
        <section className="overview-shortcuts" aria-label="Explore Atlas">
          <button className="shortcut" onClick={() => { setSelection("media"); setView("services") }}><span className="eyebrow">01 / Applications</span><strong>Media Stack <span aria-hidden="true">→</span></strong><span className="muted">Queues & Requests</span></button>
          <button className="shortcut" onClick={() => setView("network")}><span className="eyebrow">02 / Monitoring</span><strong>Network Monitoring <span aria-hidden="true">→</span></strong><span className="muted">Traffic & Link Health</span></button>
          <button className="shortcut" onClick={() => setView("history")}><span className="eyebrow">03 / Records</span><strong>Telemetry History <span aria-hidden="true">→</span></strong><span className="muted">Host Measurements</span></button>
        </section>
      </div>}
      {view === "services" && <div className="dashboard">
        <div className="mobile-service-picker">
          <label htmlFor="service-picker">Service</label>
          <select id="service-picker" value={selection === null ? "" : String(selection)} onChange={event => {
            const value = event.target.value
            setSelection(value === "media" ? "media" : value === "" ? null : Number(value))
            setActionError(null)
          }}>
            <option value="">Select a Service</option>
            {typeof selection === "number" && !selectedService && <option value={selection}>{servicesLoading ? "Loading Selected Service…" : "Selected Service Unavailable"}</option>}
            <optgroup label="Managed Services">{navigationServices.map(service => <option key={service.id} value={service.id}>{isMinecraftService(service) ? "Minecraft" : service.display_name} · {getStatusLabel(service.runtime?.state)}</option>)}</optgroup>
            <optgroup label="Applications"><option value="media">Media Stack</option></optgroup>
          </select>
          <Freshness timestamp={servicesUpdatedAt} maxAge={20} error={!!servicesError} />
          {serviceFeedback}
        </div>
        <aside className="sidebar" aria-label="Service selection"><h2 className="eyebrow">Managed Services</h2><Freshness timestamp={servicesUpdatedAt} maxAge={20} error={!!servicesError} />{serviceFeedback}
          {navigationServices.map(service => <ServiceCard key={service.id} service={navigationCard(service)} selected={selection === service.id} onSelect={handleSelectService} />)}
          <h2 className="eyebrow sidebar-group">Applications</h2>
          <button className={`service-card ${selection === "media" ? "selected" : ""}`} aria-pressed={selection === "media"} onClick={() => { setSelection("media"); setActionError(null) }}><span className="service-name service-card-name"><ServiceIcon name="media" />Media Stack</span><span className="muted">Aggregate telemetry</span></button>
        </aside>
        {selection === "media" ? <MediaPanel /> : <div className="service-detail-column">
          <ServiceDetail serverSelector={selectedService && isMinecraftService(selectedService) && <div className="minecraft-selector">
            <label htmlFor="minecraft-server">Minecraft Server</label>
            <select id="minecraft-server" value={selectedService.id} onChange={event => handleMinecraftChoice(Number(event.target.value))}>
              {minecraftServers.map(service => <option key={service.id} value={service.id}>{service.display_name}</option>)}
            </select>
          </div>} service={selectedService} minecraftStatus={minecraftStatus} minecraftError={minecraftError} minecraftUpdatedAt={minecraftUpdatedAt}
          actionLoading={pending?.serviceId === selectedService?.id ? pending?.action ?? null : null}
          actionsDisabled={pending !== null || servicesError !== null}
          actionError={actionError?.serviceId === selectedService?.id ? actionError?.message ?? null : null} onAction={requestServiceAction} /></div>}
      </div>}
      {view === "power" && <PowerPanel />}
      {view === "network" && <NetworkPanel />}
      {view === "history" && <HistoryPanel kind="host" />}
    </main>
    <footer className="app-footer">Atlas Console <span>Local time · {Intl.DateTimeFormat().resolvedOptions().timeZone}</span></footer>
  </div>
}
export default function App() {
  const { authenticated, checkingAuth, login, logout, remaining, renewing, renewError, renew } = useAuth()
  if (checkingAuth) return <main className="login-page"><p role="status">Loading Atlas…</p></main>
  return authenticated ? <><Console logout={logout} />{remaining !== null && <SessionPrompt remaining={remaining} renewing={renewing} error={renewError} onRenew={renew} onLogout={logout} />}</> : <LoginView onLogin={login} />
}
