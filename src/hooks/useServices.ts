import usePolling from "./usePolling"
import type { ManagedService } from "../types"

export default function useServices(authenticated: boolean) {
  const { data, loading, error, updatedAt, refresh } = usePolling<ManagedService[]>("/services", authenticated, 3000)
  return {
    servicesUpdatedAt: authenticated ? updatedAt : null,
    services: authenticated ? data ?? [] : [],
    servicesLoading: authenticated && loading,
    servicesError: authenticated ? error : null,
    refreshServices: refresh,
  }
}
