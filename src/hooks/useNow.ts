import { useEffect, useState } from "react"

export default function useNow() {
  const [now, setNow] = useState(() => Date.now() / 1000)
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now() / 1000), 1000); return () => clearInterval(timer) }, [])
  return now
}
