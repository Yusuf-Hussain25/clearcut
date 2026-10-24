import { Navigate, Route, Routes } from 'react-router-dom'
import Auth from './pages/Auth'
import Library from './pages/Library'
import Studio from './pages/Studio'
import ProtectedRoute from './components/ProtectedRoute'
import AppLayout from './components/AppLayout'
import { AccountProvider } from './context/AccountContext'

const App = () => (
  <Routes>
    <Route path="/login/*" element={<Auth mode="login" />} />
    <Route path="/register/*" element={<Auth mode="register" />} />
    <Route element={<ProtectedRoute />}>
      <Route element={<AccountProvider><AppLayout /></AccountProvider>}>
        <Route path="/studio" element={<Studio />} />
        <Route path="/studio/:id" element={<Studio />} />
        <Route path="/library" element={<Library />} />
      </Route>
    </Route>
    <Route path="*" element={<Navigate to="/login" replace />} />
  </Routes>
)

export default App
