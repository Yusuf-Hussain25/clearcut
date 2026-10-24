import { Suspense, lazy } from 'react'
import { Route, Routes } from 'react-router-dom'
import Landing from './pages/Landing'
import ProtectedRoute from './components/ProtectedRoute'
import AppLayout from './components/AppLayout'
import Loader from './components/ui/Loader'
import { AccountProvider } from './context/AccountContext'

// The landing page loads first; everything behind sign-in is split into its own chunks
const Auth = lazy(() => import('./pages/Auth'))
const Studio = lazy(() => import('./pages/Studio'))
const Library = lazy(() => import('./pages/Library'))
const Billing = lazy(() => import('./pages/Billing'))
const NotFound = lazy(() => import('./pages/NotFound'))

const App = () => (
  <Suspense fallback={<Loader />}>
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
  </Suspense>
)

export default App
