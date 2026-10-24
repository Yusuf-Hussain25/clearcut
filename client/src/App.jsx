import { ImageIcon } from 'lucide-react'
import Logo from './components/ui/Logo'
import ThemeToggle from './components/ui/ThemeToggle'
import EmptyState from './components/ui/EmptyState'

// Temporary shell while the 2.0 screens are rebuilt on the new design system
const App = () => (
  <div className="min-h-dvh">
    <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-5 sm:px-8">
      <Logo />
      <ThemeToggle />
    </header>
    <main className="mx-auto max-w-7xl px-4 sm:px-8">
      <div className="card">
        <EmptyState icon={ImageIcon} title="Clearcut 2.0 is on its way" text="The new studio, library and billing pages are being rebuilt." />
      </div>
    </main>
  </div>
)

export default App
