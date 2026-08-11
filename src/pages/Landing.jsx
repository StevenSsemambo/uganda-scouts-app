import { Link } from 'react-router-dom'
import { Button } from '../components/ui'

export default function Landing() {
  return (
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-center px-6 text-center">
      <div className="stitched w-24 h-24 flex items-center justify-center bg-forest text-canvas mb-6">
        <span className="font-display font-bold text-2xl">USA</span>
      </div>
      <h1 className="font-display font-bold text-3xl md:text-4xl text-ink mb-2">
        The USA
      </h1>
      <p className="text-ink/60 mb-1">Uganda Scouts Association</p>
      <p className="text-ink/60 max-w-md mb-10">
        Membership registration, subscriptions, and fee tracking for districts across Uganda.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Link to="/member/login">
          <Button variant="primary" className="px-8 py-3.5 text-base w-full sm:w-auto">
            I'm a Member
          </Button>
        </Link>
        <Link to="/admin/login">
          <Button variant="ghost" className="px-8 py-3.5 text-base w-full sm:w-auto">
            Admin Login
          </Button>
        </Link>
      </div>
    </div>
  )
}
