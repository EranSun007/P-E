import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { AppProvider } from '@/contexts/AppContext.jsx'
import { AuthProvider } from '@/contexts/AuthContext.jsx'
import { DisplayModeProvider } from '@/contexts/DisplayModeContext.jsx'
import { AppModeProvider } from '@/contexts/AppModeContext.jsx'
import { AIProvider } from '@/contexts/AIContext.jsx'
import { NotificationProvider } from '@/contexts/NotificationContext.jsx'
import { SyncProvider } from '@/contexts/SyncContext.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
    <AuthProvider>
      <NotificationProvider>
        <SyncProvider>
          <AppModeProvider>
            <DisplayModeProvider>
              <AppProvider>
                <AIProvider>
                  <App />
                </AIProvider>
              </AppProvider>
            </DisplayModeProvider>
          </AppModeProvider>
        </SyncProvider>
      </NotificationProvider>
    </AuthProvider>
) 