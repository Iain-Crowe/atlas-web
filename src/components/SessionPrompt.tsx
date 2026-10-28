import { useEffect, useId, useRef } from 'react'

export default function SessionPrompt({ remaining, renewing, error, onRenew, onLogout }: {
  remaining: number; renewing: boolean; error: string | null; onRenew: () => Promise<void>; onLogout: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const title = useId()
  const description = useId()
  useEffect(() => {
    const previous = document.activeElement
    const element = dialog.current!
    element.showModal(); button.current?.focus()
    return () => { element.close(); if (previous instanceof HTMLElement && previous.isConnected) previous.focus() }
  }, [])
  return <dialog ref={dialog} className="action-dialog session-dialog" aria-labelledby={title} aria-describedby={description} onCancel={event => { event.preventDefault(); onLogout() }}>
    <h2 id={title}>Are You Still There?</h2>
    <p id={description}>Your session is about to expire. Stay signed in to continue.</p>
    <p className="session-countdown">Signing out in <strong>{remaining}s</strong></p>
    {error && <p role="alert" className="history-warning">{error}</p>}
    <div className="service-actions">
      <button className="service-action-button" onClick={onLogout}>Sign Out</button>
      <button ref={button} className="service-action-button primary" disabled={renewing} onClick={() => void onRenew()}>{renewing ? 'Renewing…' : 'Stay Signed In'}</button>
    </div>
  </dialog>
}
