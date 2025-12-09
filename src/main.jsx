import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ModeProvider } from './contexts/ModeContext.jsx'
import './index.css'
import './styles/global.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ModeProvider>
      <App />
    </ModeProvider>
  </StrictMode>,
)
