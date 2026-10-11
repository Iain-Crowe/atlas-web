import { useEffect, useState } from "react"
import { apiFetch } from "../api"
import type { ManagedService, MinecraftStatus } from "../types"

type Result = { minecraftUpdatedAt: number | null; key: string; minecraftStatus: MinecraftStatus | null; minecraftError: string | null }

export default function useMinecraftStatus(authenticated: boolean, selectedService: ManagedService | null) {
  const id = selectedService?.id
  const name = selectedService?.name
  const state = selectedService?.runtime?.state
  const enabled = authenticated && name === "minecraft" && state === "running"
  const key = `${id}:${state}`
  const [result, setResult] = useState<Result>({ minecraftUpdatedAt: null, key: "", minecraftStatus: null, minecraftError: null })
  useEffect(() => {
    if (!enabled || id === undefined) return
    let disposed = false
    let timer: ReturnType<typeof setTimeout> | undefined
    let controller: AbortController | undefined
    async function load() {
      controller = new AbortController()
      const timeout = setTimeout(() => controller?.abort(), 18000)
      try {
        const response = await apiFetch(`/services/${id}/minecraft/status`, { signal: controller.signal })
        if (!response.ok) {
          const payload: unknown = await response.json().catch(() => null)
          const detail = payload && typeof payload === "object" && "detail" in payload && typeof payload.detail === "string" ? payload.detail : `Request failed (${response.status})`
          throw new Error(detail)
        }
        const data: MinecraftStatus = await response.json()
        if (!disposed) setResult({ minecraftUpdatedAt: Date.now() / 1000, key, minecraftStatus: data, minecraftError: null })
      } catch (error) {
        if (!disposed) setResult({ minecraftUpdatedAt: null, key, minecraftStatus: null,
          minecraftError: error instanceof Error ? error.message : "Minecraft telemetry unavailable" })
      } finally {
        clearTimeout(timeout)
        if (!disposed) timer = setTimeout(() => void load(), 3000)
      }
    }
    void load()
    return () => { disposed = true; controller?.abort(); clearTimeout(timer) }
  }, [enabled, id, key])
  if (!enabled) return { minecraftUpdatedAt: null, minecraftStatus: null, minecraftError: name === "minecraft" ? "Live telemetry is available while the container is running." : null }
  return result.key === key ? result : { minecraftUpdatedAt: null, minecraftStatus: null, minecraftError: null }
}
