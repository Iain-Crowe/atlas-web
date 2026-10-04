export function getStatusClass(state?: string): string {
  switch (state) {
    case "running":
      return "status-running"

    case "exited":
    case "dead":
      return "status-stopped"

    default:
      return "status-unknown"
  }
}

export function getStatusLabel(state?: string): string {
  switch (state) {
    case "running":
      return "Running"

    case "exited":
    case "dead":
      return "Stopped"

    case "paused":
      return "Paused"

    case "restarting":
      return "Restarting"

    default:
      return "Unknown"
  }
}