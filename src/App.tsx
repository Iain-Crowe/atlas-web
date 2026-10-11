import { useRef, useState } from "react"
import "./App.css"
import { apiFetch } from "./api"
import LoginView from "./LoginView"
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
  overview: { label: "Overview", description: "Your host and managed services at a glance." },
  services: { label: "Services", description: "Inspect workloads, view telemetry, and manage runtime state." },
  network: { label: "Network", description: "Host traffic, service bandwidth, and connection quality." },
  history: { label: "History", description: "Explore host measurements over time." },
} as const

type View = keyof typeof views
type PendingAction = { serviceId: number; action: ServiceAction }

function Console({ logout }: { logout: () => void }) {
  const authenticated = true
  const { systemStatus, systemLoading, systemError } = useSystemStatus(authenticated)
  const { services, servicesLoading, servicesError, refreshServices } = useServices(authenticated)
  const [view, setView] = useState<View>("overview")
  const [selection, setSelection] = useState<number | "media" | null>(null)
  const selectedService = services.find(service => service.id === selection) ?? null
  const { minecraftStatus, minecraftError } = useMinecraftStatus(authenticated && view === "services", selectedService)
  const [pending, setPending] = useState<PendingAction | null>(null)
  const [actionError, setActionError] = useState<{ serviceId: number; message: string } | null>(null)
  const actionInFlight = useRef(false)
  const session = useRef(0)

  function handleLogout() {
    session.current += 1
    logout()
    setSelection(null)
    setView("overview")
    setActionError(null)
    setPending(null)
  }

  function handleSelectService(service: ManagedService) {
    setSelection(service.id)
    setActionError(null)
    setView("services")
  }

  async function handleServiceAction(action: ServiceAction) {
    if (!selectedService || actionInFlight.current) return
    const serviceId = selectedService.id
    const currentSession = session.current
    actionInFlight.current = true
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
          await refreshServices()
        } catch {
          throw new Error("Action accepted, but status could not be refreshed. Check the service before retrying.")
        }
      }
    } catch (error) {
      if (session.current === currentSession) setActionError({ serviceId, message: error instanceof Error ? error.message : `Failed to ${action} service` })
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
        <div><p className="brand">Atlas</p><p className="subtitle">Homelab Control Console</p></div>
      </div>
      <button className="logout-button" onClick={handleLogout}>Sign out</button>
    </header>
    <nav className="primary-nav" aria-label="Main navigation">
      {(Object.keys(views) as View[]).map(key => <button key={key} type="button" aria-current={view === key ? "page" : undefined} onClick={() => setView(key)}>{views[key].label}</button>)}
    </nav>
    <main id="main-content" tabIndex={-1}>
      <div className="page-heading"><div><h1>{views[view].label}</h1><p className="muted">{views[view].description}</p></div><span className="host-label">{systemStatus?.hostname ?? "Atlas host"}</span></div>
      {view === "overview" && <div className="overview-layout">
        <SystemOverview status={systemStatus} loading={systemLoading} error={systemError} />
        <section className="panel">
          <div className="section-heading"><div><h2>Managed services</h2><p className="muted">{servicesError ? "Status refresh unavailable" : servicesLoading ? "Checking runtime status…" : `${running} of ${services.length} running`}</p></div><button className="text-button" onClick={() => setView("services")}>View services →</button></div>
          {serviceFeedback}
          <div className="overview-services">{services.map(service => <ServiceCard key={service.id} service={service} selected={false} onSelect={handleSelectService} />)}</div>
        </section>
        <section className="overview-shortcuts" aria-label="Explore Atlas">
          <button className="shortcut" onClick={() => { setSelection("media"); setView("services") }}><span className="eyebrow">Media stack</span><strong>Downloads & libraries <span aria-hidden="true">↗</span></strong><span className="muted">Queues, requests, and application status.</span></button>
          <button className="shortcut" onClick={() => setView("network")}><span className="eyebrow">Network</span><strong>Traffic & connection <span aria-hidden="true">→</span></strong><span className="muted">Bandwidth, router latency, and Wi-Fi health.</span></button>
          <button className="shortcut" onClick={() => setView("history")}><span className="eyebrow">History</span><strong>Host trends <span aria-hidden="true">→</span></strong><span className="muted">CPU, memory, temperature, and storage.</span></button>
        </section>
      </div>}
      {view === "services" && <div className="dashboard">
        <aside className="sidebar" aria-label="Service selection"><h2 className="eyebrow">Managed services</h2>{serviceFeedback}
          {services.map(service => <ServiceCard key={service.id} service={service} selected={selection === service.id} onSelect={handleSelectService} />)}
          <h2 className="eyebrow sidebar-group">Applications</h2>
          <button className={`service-card ${selection === "media" ? "selected" : ""}`} aria-pressed={selection === "media"} onClick={() => { setSelection("media"); setActionError(null) }}><span className="service-name">Media Stack</span><span className="muted">Aggregate telemetry</span></button>
        </aside>
        {selection === "media" ? <MediaPanel /> : <ServiceDetail service={selectedService} minecraftStatus={minecraftStatus} minecraftError={minecraftError}
          actionLoading={pending?.serviceId === selectedService?.id ? pending?.action ?? null : null}
          actionsDisabled={pending !== null || servicesError !== null}
          actionError={actionError?.serviceId === selectedService?.id ? actionError?.message ?? null : null} onAction={handleServiceAction} />}
      </div>}
      {view === "network" && <NetworkPanel />}
      {view === "history" && <HistoryPanel kind="host" />}
    </main>
    <footer className="app-footer">Atlas Console <span>Local time · {Intl.DateTimeFormat().resolvedOptions().timeZone}</span></footer>
  </div>
}
export default function App() {
  const { authenticated, checkingAuth, login, logout } = useAuth()
  if (checkingAuth) return <main className="login-page"><p role="status">Loading Atlas…</p></main>
  return authenticated ? <Console logout={logout} /> : <LoginView onLogin={login} />
}
