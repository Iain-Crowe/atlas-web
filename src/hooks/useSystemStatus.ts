import usePolling from "./usePolling"
import type { SystemStatus } from "../types"

export default function useSystemStatus(authenticated: boolean) {
  const { data, loading, error, updatedAt } = usePolling<SystemStatus>("/system/status", authenticated, 5000)
  return {
    systemUpdatedAt: authenticated ? updatedAt : null,
    systemStatus: authenticated ? data : null,
    systemLoading: authenticated && loading,
    systemError: authenticated ? error : null,
  }
}
