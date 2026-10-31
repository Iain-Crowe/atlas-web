import type { ReactNode } from "react"
import { getStatusClass, getStatusLabel } from "../utils/serviceStatus"

const identities = {
  "minecraft-craftbox": { category: "Game Server · Craftbox", theme: "minecraft" },
  minecraft: { category: "Game Server", theme: "minecraft" },
  jellyfin: { category: "Media Library", theme: "jellyfin" },
  pihole: { category: "DNS & Filtering", theme: "pihole" },
  actual: { category: "Personal Finance", theme: "actual" },
  homebox: { category: "Home Inventory", theme: "homebox" },
  changedetection: { category: "Website Monitoring", theme: "changedetection" },
  media: { category: "Media Automation", theme: "media" },
} as const

export function ServiceIcon({ name }: { name: string }) {
  return <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" focusable="false" className="service-icon">
    {(name === "minecraft" || name === "minecraft-craftbox") ? <>
      <path d="m16 3 12 6.5v13L16 29 4 22.5v-13Z" fill="currentColor" opacity=".13" />
      <path d="m16 3 12 6.5v13L16 29 4 22.5v-13Z M4 9.5 16 16l12-6.5M16 16v13" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="m10 6.5 12 6.3M10 12.7 22 6.3" stroke="currentColor" strokeWidth="1.4" />
    </> : name === "jellyfin" ? <>
      <path d="M14.2 4a2 2 0 0 1 3.6 0l11 21a2 2 0 0 1-1.8 3H5a2 2 0 0 1-1.8-3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" fill="currentColor" fillOpacity=".1" />
      <path d="m16 12 6 11H10Z" fill="currentColor" />
    </> : name === "pihole" ? <>
      <path d="M16 3 27 7v8c0 7-7 12-11 14C12 27 5 22 5 15V7Z" stroke="currentColor" strokeWidth="1.7" fill="currentColor" fillOpacity=".1" strokeLinejoin="round" />
      <path d="M11 17c0-5 6-7 11-7 0 6-3 11-8 10m-3 3 7-9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </> : name === "actual" ? <>
      <rect x="4" y="6" width="24" height="21" rx="3" stroke="currentColor" strokeWidth="1.7" fill="currentColor" fillOpacity=".1" />
      <path d="M4 12h24M10 22v-4m6 4v-7m6 7v-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </> : name === "homebox" ? <>
      <path d="m4 14 12-10 12 10M7 12v15h18V12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="12" y="16" width="8" height="11" rx="1" fill="currentColor" fillOpacity=".15" stroke="currentColor" strokeWidth="1.7" />
    </> : name === "changedetection" ? <>
      <rect x="4" y="5" width="24" height="22" rx="3" stroke="currentColor" strokeWidth="1.7" fill="currentColor" fillOpacity=".1" />
      <path d="M4 11h24M8 20h4l3-5 4 9 3-4h2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </> : name === "media" ? <>
      <rect x="4" y="8" width="24" height="20" rx="3" stroke="currentColor" strokeWidth="1.7" fill="currentColor" fillOpacity=".1" />
      <path d="M8 4h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="m13 13 8 5-8 5Z" fill="currentColor" />
    </> : <>
      <rect x="4" y="4" width="24" height="10" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <rect x="4" y="18" width="24" height="10" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M9 9h1m-1 14h1M16 9h7m-7 14h7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </>}
  </svg>
}

export default function ServiceIdentity({ name, title, state, statusLabel, actions, selector, resources }: {
  name: string
  title: string
  statusLabel?: string
  state?: string
  actions?: ReactNode
  selector?: ReactNode
  resources?: ReactNode
}) {
  const identity = Object.hasOwn(identities, name) ? identities[name as keyof typeof identities] : null
  return <header className={`service-identity-header ${resources ? "with-resources" : ""}`}>
    <div className="service-identity">
      <div className="service-emblem"><ServiceIcon name={name} /></div>
      <div className="service-identity-copy">
        <p className="service-category">{identity?.category ?? "Managed Service"}</p>
        <h2>{title}</h2>
        {name !== "media" && <div className="service-status detail-status"><span className={`status-dot ${getStatusClass(statusLabel && ["Starting", "Unhealthy", "Status Stale"].includes(statusLabel) ? "restarting" : state)}`} /><span className="status-text">{statusLabel ?? getStatusLabel(state)}</span></div>}
        {name === "media" && <p className="service-refresh">Live Aggregates · 30-Second Refresh</p>}
      </div>
    </div>
    {actions}
    {selector}
    {resources}
  </header>
}
