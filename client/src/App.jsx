import { Route, Routes } from 'react-router-dom'
import Landing from './pages/Landing'
import Auth from './pages/Auth'
import Studio from './pages/Studio'
import Library from './pages/Library'
import Billing from './pages/Billing'
import NotFound from './pages/NotFound'
import ProtectedRoute from './components/ProtectedRoute'
import AppLayout from './components/AppLayout'
import { AccountProvider } from './context/AccountContext'

const App = () => (
  <Routes>
    <Route path="/" element={<Landing />} />
    <Route path="/login/*" element={<Auth mode="login" />} />
    <Route path="/register/*" element={<Auth mode="register" />} />
    <Route element={<ProtectedRoute />}>
      <Route element={<AccountProvider><AppLayout /></AccountProvider>}>
        <Route path="/studio" element={<Studio />} />
        <Route path="/studio/:id" element={<Studio />} />
        <Route path="/library" element={<Library />} />
        <Route path="/billing" element={<Billing />} />
      </Route>
    </Route>
    <Route path="*" element={<NotFound />} />
  </Routes>
)

export default App
