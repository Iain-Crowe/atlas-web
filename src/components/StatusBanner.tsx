import type { ReactNode } from "react"

export type StatusTone = "good" | "attention" | "unavailable"

type Props = {
  title: string
  description?: string
  tone: StatusTone
  children?: ReactNode
}

export default function StatusBanner({ title, description, tone, children }: Props) {
  return <div className={`status-banner tone-${tone}`}>
    <div className="status-banner-main">
      <span className="status-symbol" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="8.5" />
          {tone === "good" ? <path d="m8 12 2.5 2.5L16 9" /> : <><path d="M12 7.5v5" /><circle cx="12" cy="16" r=".65" fill="currentColor" stroke="none" /></>}
        </svg>
      </span>
      <div><strong>{title}</strong>{description && <p>{description}</p>}</div>
    </div>
    {children}
  </div>
}
