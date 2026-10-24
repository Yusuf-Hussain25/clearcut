import { Navigate, Route, Routes } from 'react-router-dom'
import { ScissorsIcon } from 'lucide-react'
import Auth from './pages/Auth'
import Library from './pages/Library'
import ProtectedRoute from './components/ProtectedRoute'
import AppLayout from './components/AppLayout'
import EmptyState from './components/ui/EmptyState'
import { AccountProvider } from './context/AccountContext'

// Placeholder until the studio is rebuilt
const StudioSoon = () => (
  <div className="card">
    <EmptyState icon={ScissorsIcon} title="The studio is being rebuilt" text="Your library already works." />
  </div>
)

const App = () => (
  <Routes>
    <Route path="/login/*" element={<Auth mode="login" />} />
    <Route path="/register/*" element={<Auth mode="register" />} />
    <Route element={<ProtectedRoute />}>
      <Route element={<AccountProvider><AppLayout /></AccountProvider>}>
        <Route path="/studio" element={<StudioSoon />} />
        <Route path="/studio/:id" element={<StudioSoon />} />
        <Route path="/library" element={<Library />} />
      </Route>
    </Route>
    <Route path="*" element={<Navigate to="/login" replace />} />
  </Routes>
)

export default App
