import { BrowserRouter } from 'react-router-dom'
import { ClerkProvider } from '@clerk/react'
import { Toaster } from 'react-hot-toast'
import App from './App.jsx'
import { useTheme } from './hooks/useTheme'
import { clerkAppearance } from './lib/clerkAppearance'

// Phones have a bottom tab bar, so toasts appear at the top there
const toastPosition = () => (window.matchMedia('(max-width: 767px)').matches ? 'top-center' : 'bottom-right')

// Clerk + router + toasts, with Clerk's components following the current theme
const Root = ({ publishableKey }) => {
  const theme = useTheme()
  return (
    <ClerkProvider publishableKey={publishableKey} afterSignOutUrl="/" appearance={clerkAppearance(theme)}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
      <Toaster
        position={toastPosition()}
        toastOptions={{
          style: {
            background: 'var(--panel-solid)',
            color: 'var(--text)',
            border: '1px solid var(--border-strong)',
            borderRadius: '14px',
            boxShadow: 'var(--shadow-md)',
            fontSize: '14px',
          },
          success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
          error: { iconTheme: { primary: '#f43f5e', secondary: '#fff' } },
        }}
      />
    </ClerkProvider>
  )
}

export default Root
