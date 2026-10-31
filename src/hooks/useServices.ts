import usePolling from "./usePolling"
import type { ManagedService, ServiceResourceSnapshot } from "../types"

export default function useServices(authenticated: boolean) {
  const { data, loading, error, updatedAt, refresh } = usePolling<ManagedService[]>("/services", authenticated, 3000)
  const resources = usePolling<ServiceResourceSnapshot>("/services/resources", authenticated, 5000)
  return {
    servicesUpdatedAt: authenticated ? updatedAt : null,
    services: authenticated ? (data ?? []).map(service => ({ ...service,
      resources: service.runtime_name ? resources.data?.readings[service.resource_key ?? service.runtime_name] : undefined,
      resourcesError: resources.error, statusUpdatedAt: updatedAt, statusError: error,
    })) : [],
    servicesLoading: authenticated && loading,
    servicesError: authenticated ? error : null,
    refreshServices: refresh,
  }
}
