import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

import "@fontsource/space-grotesk/latin-500.css"
import "@fontsource/space-grotesk/latin-600.css"
import "@fontsource/space-grotesk/latin-700.css"
import "@fontsource/inter/400.css"
import "@fontsource/inter/500.css"
import "@fontsource/inter/600.css"
import "@fontsource/inter/700.css"

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
