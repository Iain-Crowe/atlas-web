import type { ManagedService } from "../types"

export function isMinecraftService(service: ManagedService | null): boolean {
  return service?.runtime_type === "docker" &&
    (service.runtime_name === "minecraft" || service.runtime_name === "minecraft-craftbox")
}
