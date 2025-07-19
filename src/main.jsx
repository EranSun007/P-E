import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import { AuthProvider } from '@/contexts/AuthContext.jsx'
import AuthErrorBoundary from '@/components/auth/AuthErrorBoundary.jsx'
import '@/index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
    <AuthErrorBoundary>
        <AuthProvider>
            <App />
        </AuthProvider>
    </AuthErrorBoundary>
) 