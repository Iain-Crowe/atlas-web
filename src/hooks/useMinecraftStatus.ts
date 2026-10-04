import { useEffect, useState } from "react"

import { apiFetch } from "../api"
import type {
  ManagedService,
  MinecraftStatus,
} from "../types"

function useMinecraftStatus(
  authenticated: boolean,
  selectedService: ManagedService | null
): MinecraftStatus | null {
  const [minecraftStatus, setMinecraftStatus] =
    useState<MinecraftStatus | null>(null)

  useEffect(() => {
    if (
      !authenticated ||
      !selectedService ||
      selectedService.name !== "minecraft"
    ) {
      setMinecraftStatus(null)
      return
    }

    const serviceId = selectedService.id

    async function loadMinecraftStatus() {
      const response = await apiFetch(
        `/services/${serviceId}/minecraft/status`
      )

      if (!response.ok) {
        throw new Error(
          `Request failed: ${response.status}`
        )
      }

      const data: MinecraftStatus =
        await response.json()

      setMinecraftStatus(data)
    }

    void loadMinecraftStatus()

    const interval = window.setInterval(() => {
      void loadMinecraftStatus()
    }, 3000)

    return () => {
      window.clearInterval(interval)
    }
  }, [
    authenticated,
    selectedService?.id,
    selectedService?.name,
  ])

  return minecraftStatus
}

export default useMinecraftStatus