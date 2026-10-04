import { useEffect, useState } from "react"

import "./App.css"
import { apiFetch } from "./api"
import LoginView from "./LoginView"
import SystemOverview from "./components/SystemOverview"
import ServiceCard from "./components/ServiceCard"
import ServiceDetail from "./components/ServiceDetail"
import useAuth from "./hooks/useAuth"
import useSystemStatus from "./hooks/useSystemStatus"
import useServices from "./hooks/useServices"
import useMinecraftStatus from "./hooks/useMinecraftStatus"
import type {
  ManagedService,
  ServiceAction,
} from "./types"

function App() {
  const {
    authenticated,
    checkingAuth,
    login,
    logout,
  } = useAuth()

  const {
    systemStatus,
    systemLoading,
    systemError,
  } = useSystemStatus(authenticated)

  const {
    services,
    servicesLoading,
    servicesError,
    refreshServices,
  } = useServices(authenticated)

  const [selectedService, setSelectedService] =
    useState<ManagedService | null>(null)

  const minecraftStatus = useMinecraftStatus(
    authenticated,
    selectedService
  )

  const [actionLoading, setActionLoading] = useState<ServiceAction | null>(null)

  const [actionError, setActionError] = useState<string | null>(null)

  function handleLogout() {
    logout()
    setSelectedService(null)
  }

  function handleSelectService(service: ManagedService) {
    setSelectedService(service)
    setActionError(null)
  }

  useEffect(() => {
    if (!selectedService) {
      return
    }

    const updated = services.find(
      (service) => service.id === selectedService.id
    )

    if (updated) {
      setSelectedService(updated)
    }
  }, [services, selectedService?.id])

  async function handleServiceAction(action: ServiceAction) {
    if (!selectedService) {
      return
    }

    setActionLoading(action)
    setActionError(null)

    try {
      const response = await apiFetch(
        `/services/${selectedService.id}/${action}`,
        {
          method: "POST",
        }
      )

      if (!response.ok) {
        const data = await response.json()

        throw new Error(
          data.detail ?? `Request failed: ${response.status}`
        )
      }

      const refreshedServices = await refreshServices()

      const refreshedSelection = refreshedServices.find(
        (service) => service.id === selectedService.id
      )

      setSelectedService(refreshedSelection ?? null)
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : `Failed to ${action} service`
      )
    } finally {
      setActionLoading(null)
    }
  }

  if (checkingAuth) {
    return <p>Loading Atlas...</p>
  }

  if (!authenticated) {
    return <LoginView onLogin={login} />
  }

  return (
  <main className="app-shell">
    <header className="topbar">
      <div className="brand-group">
        <div className="brand-logo-wrap">
          <img
            src="/atlas-logo.png"
            alt="Atlas logo"
            className="brand-logo"
          />
        </div>

        <div>
          <h1 className="brand">Atlas</h1>
          <p className="subtitle">Homelab Control Console</p>
        </div>
      </div>

      <button className="logout-button" onClick={handleLogout}>
        Logout
      </button>
    </header>
    <section className="dashboard">
      <aside className="sidebar">

        <SystemOverview
          status={systemStatus}
          loading={systemLoading}
          error={systemError}
        />

        {servicesLoading && <p>Loading services...</p>}
        {servicesError && <p>{servicesError}</p>}

        {!servicesLoading &&
          !servicesError &&
          services.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              selected={selectedService?.id === service.id}
              onSelect={handleSelectService}
            />
          ))}
      </aside>
      
      <ServiceDetail
        service={selectedService}
        minecraftStatus={minecraftStatus}
        actionLoading={actionLoading}
        actionError={actionError}
        onAction={handleServiceAction}
      />
    </section>
  </main>
)
}

export default App