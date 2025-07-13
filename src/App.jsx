import './App.css'
import Pages from "@/pages/index.jsx"
import { Toaster } from "@/components/ui/toaster"
import ErrorBoundary from "@/components/ErrorBoundary.jsx"

function App() {
  return (
    <ErrorBoundary fallbackMessage="The application encountered an error. Please refresh the page or try again later.">
      <Pages />
      <Toaster />
    </ErrorBoundary>
  )
}

export default App 