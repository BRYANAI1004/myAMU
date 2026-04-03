import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { AccountProvider } from './context/AccountContext'
import { AdminAuthProvider } from './context/AdminAuthContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AccountProvider>
        <AdminAuthProvider>
          <App />
        </AdminAuthProvider>
      </AccountProvider>
    </BrowserRouter>
  </StrictMode>,
)
