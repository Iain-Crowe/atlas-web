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
    usage_percent: number | null
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
export type HistoryRange = "1h" | "6h" | "24h" | "7d"
export type MetricAggregate = {
  mean: number | null
  minimum: number | null
  maximum: number | null
  count: number
}
export type HistoryPoint = {
  timestamp: number
  samples: number
  expected: number
  successful: number
  metrics: Record<string, MetricAggregate>
}
export type TelemetryHistory = {
  kind: "host" | "minecraft" | "network"
  range: HistoryRange
  start: number
  end: number
  bucket_seconds: number
  sample_seconds: number
  retention_days: number
  last_sample_at: number | null
  last_success_at: number | null
  received_bytes?: number
  sent_bytes?: number
  covered_seconds?: number
  points: HistoryPoint[]
}
