import { useEffect, useState } from "react"

export default function useSessionPreference<T extends string>(key: string, choices: readonly T[], fallback: T) {
  const [value, setValue] = useState<T>(() => {
    try { const saved = sessionStorage.getItem(key); return choices.includes(saved as T) ? saved as T : fallback } catch { return fallback }
  })
  useEffect(() => { try { sessionStorage.setItem(key, value) } catch { /* Preferences are optional when storage is unavailable. */ } }, [key, value])
  return [value, setValue] as const
}
