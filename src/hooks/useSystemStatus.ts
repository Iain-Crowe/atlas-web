import { useEffect, useState } from "react"

import { apiFetch } from "../api"
import type { SystemStatus } from "../types"

type UseSystemStatusResult = {
  systemStatus: SystemStatus | null
  systemLoading: boolean
  systemError: string | null
}

function useSystemStatus(
  authenticated: boolean
): UseSystemStatusResult {
  const [systemStatus, setSystemStatus] =
    useState<SystemStatus | null>(null)

  const [systemLoading, setSystemLoading] =
    useState(false)

  const [systemError, setSystemError] =
    useState<string | null>(null)

  useEffect(() => {
    if (!authenticated) {
      setSystemStatus(null)
      setSystemLoading(false)
      setSystemError(null)
      return
    }

    async function loadSystemStatus(
      showLoading = true
    ) {
      if (showLoading) {
        setSystemLoading(true)
      }

      setSystemError(null)

      try {
        const response = await apiFetch(
          "/system/status"
        )

        if (!response.ok) {
          throw new Error(
            `Request failed: ${response.status}`
          )
        }

        const data: SystemStatus =
          await response.json()

        setSystemStatus(data)
      } catch (err) {
        setSystemError(
          err instanceof Error
            ? err.message
            : "Failed to load system status"
        )
      } finally {
        if (showLoading) {
          setSystemLoading(false)
        }
      }
    }

    void loadSystemStatus(true)

    const interval = window.setInterval(() => {
      void loadSystemStatus(false)
    }, 5000)

    return () => {
      window.clearInterval(interval)
    }
  }, [authenticated])

  return {
    systemStatus,
    systemLoading,
    systemError,
  }
}

export default useSystemStatus