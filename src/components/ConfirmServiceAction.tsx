import { useEffect, useId, useRef } from "react"

export default function ConfirmServiceAction({ name, action, disabled, onCancel, onConfirm }: { name: string; action: string; disabled: boolean; onCancel: () => void; onConfirm: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const cancel = useRef<HTMLButtonElement>(null)
  const title = useId()
  useEffect(() => { const element = dialog.current!; element.showModal(); cancel.current?.focus(); return () => element.close() }, [])
  return <dialog ref={dialog} className="action-dialog" aria-labelledby={title} onCancel={event => { event.preventDefault(); onCancel() }}>
    <h2 id={title}>{action === "stop" ? "Stop" : "Restart"} {name}?</h2>
    <p>{action === "stop" ? "This service will remain stopped until you start it again." : "This service will be briefly unavailable while it restarts."}</p>
    <div className="service-actions"><button ref={cancel} onClick={onCancel}>Cancel</button><button className="service-action-button danger" disabled={disabled} onClick={onConfirm}>{action === "stop" ? "Stop" : "Restart"} {name}</button></div>
    {disabled && <p className="history-warning">Service status changed or is unavailable. Cancel and check its current state.</p>}
  </dialog>
}
