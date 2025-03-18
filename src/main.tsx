import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.v250318.tsx'
import './index.css'
import { registerServiceWorker } from './pwa'

// Service Worker 등록
registerServiceWorker();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)