import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { AppProvider } from '@/contexts/AppContext.jsx'
import { AuthProvider } from '@/contexts/AuthContext.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
    <AuthProvider>
      <AppProvider>
        <App />
      </AppProvider>
    </AuthProvider>
) 