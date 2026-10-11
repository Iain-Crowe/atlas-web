import { useCallback, useEffect, useState } from "react"

import { apiFetch } from "../api"
import type { ManagedService } from "../types"

type UseServicesResult = {
  services: ManagedService[]
  servicesLoading: boolean
  servicesError: string | null
  refreshServices: (
    showLoading?: boolean
  ) => Promise<ManagedService[]>
}

function useServices(
  authenticated: boolean
): UseServicesResult {
  const [services, setServices] =
    useState<ManagedService[]>([])

  const [servicesLoading, setServicesLoading] =
    useState(false)

  const [servicesError, setServicesError] =
    useState<string | null>(null)

  const refreshServices = useCallback(
    async (
      showLoading = true
    ): Promise<ManagedService[]> => {
      if (showLoading) {
        setServicesLoading(true)
      }

      setServicesError(null)

      try {
        const response = await apiFetch("/services")

        if (!response.ok) {
          throw new Error(
            `Request failed: ${response.status}`
          )
        }

        const data: ManagedService[] =
          await response.json()

        setServices(data)

        return data
      } catch (err) {
        setServicesError(
          err instanceof Error
            ? err.message
            : "Failed to load services"
        )

        throw err
      } finally {
        if (showLoading) {
          setServicesLoading(false)
        }
      }
    },
    []
  )

  useEffect(() => {
    if (!authenticated) {
      setServices([])
      setServicesLoading(false)
      setServicesError(null)
      return
    }

    void refreshServices(true).catch(() => {})

    const interval = window.setInterval(() => {
      void refreshServices(false).catch(() => {})
    }, 3000)

    return () => {
      window.clearInterval(interval)
    }
  }, [authenticated, refreshServices])

  return {
    services,
    servicesLoading,
    servicesError,
    refreshServices,
  }
}

export default useServices