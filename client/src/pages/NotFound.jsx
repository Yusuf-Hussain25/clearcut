import { Link } from 'react-router-dom'
import { ArrowLeftIcon, ImageOffIcon } from 'lucide-react'
import Logo from '../components/ui/Logo'
import EmptyState from '../components/ui/EmptyState'

const NotFound = () => (
  <div className="mx-auto flex min-h-dvh max-w-3xl flex-col px-4 py-5 sm:px-8">
    <Logo />
    <div className="card my-auto">
      <EmptyState
        icon={ImageOffIcon}
        title="This page was cut out"
        text="The link may be old or mistyped. Nothing is here, not even a transparent pixel."
        action={<Link to="/" className="btn btn-primary btn-sm"><ArrowLeftIcon size={15} /> Back to Clearcut</Link>}
      />
    </div>
  </div>
)

export default NotFound
