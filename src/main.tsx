import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { SmartHomeProvider } from './context/SmartHomeProvider'
import './styles/global.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SmartHomeProvider>
      <App />
    </SmartHomeProvider>
  </StrictMode>,
)
