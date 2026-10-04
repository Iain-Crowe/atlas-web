export type ManagedService = {
  id: number
  name: string
  display_name: string
  runtime_type: string
  runtime_name: string | null
  runtime: {
    state: string
  } | null
}

export type SystemStatus = {
  hostname: string
  uptime_seconds: number
  load_average: [number, number, number]
  cpu: {
    usage_percent: number
    temperature_c: number | null
  }
  memory: {
    total_mb: number
    available_mb: number
  }
  disk: {
    total_gb: number
    used_gb: number
    free_gb: number
  }
}

export type MinecraftStatus = {
  online: number
  max: number
  players: string[]
  tps: number | null
  mspt: number | null
  loaded_chunks: number | null
}

export type ServiceAction = 
| "start" 
| "stop" 
| "restart"