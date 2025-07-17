import './App.css'
import Pages from "@/pages/index.jsx"
import { Toaster } from "@/components/ui/toaster"
import ErrorBoundary from "@/components/ErrorBoundary.jsx"
import { useEffect } from 'react'
import { DataMigration } from '@/utils/dataMigration'

function App() {
  useEffect(() => {
    // Run data migrations on app startup
    DataMigration.runMigrations().catch(error => {
      console.error('Data migration failed:', error);
    });
  }, []);

  return (
    <ErrorBoundary fallbackMessage="The application encountered an error. Please refresh the page or try again later.">
      <Pages />
      <Toaster />
    </ErrorBoundary>
  )
}

export default App 