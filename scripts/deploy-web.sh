#!/usr/bin/env bash
# Usage: bash scripts/deploy-web.sh [--check|--deploy]
# Run as your normal Atlas user. Docker commands use sudo when needed.
set -Eeuo pipefail
umask 077

mode=${1:---check}
if [[ $# -gt 1 || ( "$mode" != --check && "$mode" != --deploy ) ]]; then
  echo "Usage: $0 [--check|--deploy]" >&2
  exit 2
fi
atlas_root=/srv/atlas
container=atlas-web
for command in docker python3; do
  command -v "$command" >/dev/null || { echo "Required command missing: $command" >&2; exit 1; }
done
privilege=()
if [[ $EUID -ne 0 ]]; then
  sudo -v
  privilege=(sudo)
fi
docker_cmd=("${privilege[@]}" docker)
compose=("${docker_cmd[@]}" compose --project-directory "$atlas_root" -f "$atlas_root/compose.yaml" -f "$atlas_root/compose.override.yaml")
for file in "$atlas_root/compose.yaml" "$atlas_root/compose.override.yaml"; do
  "${privilege[@]}" test -f "$file" || { echo "Required Compose file missing: $file" >&2; exit 1; }
done
service=$("${docker_cmd[@]}" inspect --format '{{ index .Config.Labels "com.docker.compose.service" }}' "$container")
[[ -n "$service" && "$service" != '<no value>' ]] || { echo "Cannot identify the frontend Compose service." >&2; exit 1; }
project=$("${docker_cmd[@]}" inspect --format '{{ index .Config.Labels "com.docker.compose.project" }}' "$container")
[[ -n "$project" && "$project" != '<no value>' ]] || { echo "Cannot identify the Compose project." >&2; exit 1; }
compose+=(--project-name "$project")

temp_dir=$(mktemp -d)
trap 'rm -rf "$temp_dir"' EXIT
"${compose[@]}" config --format json > "$temp_dir/compose.json"
"${docker_cmd[@]}" inspect "$container" > "$temp_dir/container.json"
python3 - "$temp_dir" "$service" <<'PY'
import json
import sys
from pathlib import Path
from typing import Any

root = Path(sys.argv[1])
config: dict[str, Any] = json.loads((root / "compose.json").read_text())
current: dict[str, Any] = json.loads((root / "container.json").read_text())[0]
service: dict[str, Any] | None = config.get("services", {}).get(sys.argv[2])

def require(condition: bool, message: str) -> None:
    if not condition:
        raise SystemExit(f"Preflight failed: {message}")

require(service is not None, "The current frontend service is absent from the merged Compose configuration.")
assert service is not None
require(current.get("State", {}).get("Running") is True, "The current frontend is not running. Restore it before using this deployment script.")
ports: list[dict[str, Any]] = service.get("ports", [])
require(any(str(port.get("published")) == "443" and port.get("protocol", "tcp") == "tcp" for port in ports), "The merged configuration does not publish HTTPS port 443.")
current_ports: dict[str, Any] = current.get("HostConfig", {}).get("PortBindings") or {}
require(any(binding.get("HostPort") == "443" for bindings in current_ports.values() for binding in bindings or []), "The current container does not publish HTTPS. Restore the existing HTTPS setup first.")
for target, bindings in current_ports.items():
    target_port, protocol = target.split("/")
    for binding in bindings or []:
        require(any(str(port.get("target")) == target_port and str(port.get("published")) == binding.get("HostPort") and port.get("protocol", "tcp") == protocol and port.get("host_ip", "") == binding.get("HostIp", "") for port in ports), f"An existing port binding would change: {target}.")
volumes: list[dict[str, Any]] = service.get("volumes", [])
for mount in current.get("Mounts", []):
    if mount.get("Type") != "bind":
        continue
    matches = [volume for volume in volumes if volume.get("type") == "bind" and volume.get("source") == mount.get("Source") and volume.get("target") == mount.get("Destination")]
    require(bool(matches), f"An existing bind mount would be removed or changed: {mount.get('Destination')}.")
    require(mount.get("RW", True) or any(volume.get("read_only") for volume in matches), "An existing read-only mount would become writable.")
print("Preflight passed: both Compose files loaded; HTTPS and existing bind mounts preserved.")
PY
if [[ "$mode" == --check ]]; then
  echo "No changes made. To deploy: bash /srv/atlas/web/scripts/deploy-web.sh --deploy"
  exit 0
fi

old_image=$("${docker_cmd[@]}" inspect --format '{{.Image}}' "$container")
image_tag=$("${docker_cmd[@]}" inspect --format '{{.Config.Image}}' "$container")
backup_tag="atlas-web-rollback:$(date -u +%Y%m%d-%H%M%S)"
"${docker_cmd[@]}" image tag "$old_image" "$backup_tag"
echo "Building frontend; the running container stays in place during the build."
"${compose[@]}" build "$service"

rollback() {
  trap - ERR
  echo "Deployment verification failed. Restoring the previous frontend image." >&2
  "${docker_cmd[@]}" image tag "$backup_tag" "$image_tag"
  "${compose[@]}" up -d --no-build --no-deps "$service"
  echo "Previous image restored. The source checkout still contains the new code." >&2
  exit 1
}
trap rollback ERR
"${compose[@]}" up -d --no-build --no-deps "$service"
"${docker_cmd[@]}" exec "$container" nginx -t
"${docker_cmd[@]}" inspect "$container" > "$temp_dir/after.json"
python3 - "$temp_dir/after.json" <<'PY'
import json
import sys
from pathlib import Path
from typing import Any
container: dict[str, Any] = json.loads(Path(sys.argv[1]).read_text())[0]
bindings: dict[str, Any] = container.get("NetworkSettings", {}).get("Ports") or {}
if not container.get("State", {}).get("Running") or not any(port.get("HostPort") == "443" for ports in bindings.values() for port in ports or []):
    raise SystemExit("Frontend is not running with HTTPS port 443 published.")
PY
trap - ERR
"${docker_cmd[@]}" logs --tail 12 "$container"
printf 'Deployment completed. Reload https://atlas.home.arpa/ with Ctrl+Shift+R.\nRollback image retained: %s\n' "$backup_tag"
