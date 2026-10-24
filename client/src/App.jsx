import { Navigate, Route, Routes } from 'react-router-dom'
import { UserButton } from '@clerk/react'
import { ImageIcon } from 'lucide-react'
import Auth from './pages/Auth'
import ProtectedRoute from './components/ProtectedRoute'
import Logo from './components/ui/Logo'
import EmptyState from './components/ui/EmptyState'

// Placeholder until the studio is rebuilt
const StudioSoon = () => (
  <div className="mx-auto max-w-7xl px-4 py-5 sm:px-8">
    <header className="flex items-center justify-between">
      <Logo />
      <UserButton />
    </header>
    <div className="card mt-8">
      <EmptyState icon={ImageIcon} title="You're signed in" text="The new studio is coming in the next commit." />
    </div>
  </div>
)

const App = () => (
  <Routes>
    <Route path="/login/*" element={<Auth mode="login" />} />
    <Route path="/register/*" element={<Auth mode="register" />} />
    <Route element={<ProtectedRoute />}>
      <Route path="/studio" element={<StudioSoon />} />
    </Route>
    <Route path="*" element={<Navigate to="/login" replace />} />
  </Routes>
)

export default App
