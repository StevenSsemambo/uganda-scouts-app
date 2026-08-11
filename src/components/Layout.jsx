import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Button } from './ui'

const memberLinks = [
  { to: '/member', label: 'My Dashboard', end: true },
  { to: '/member/profile', label: 'My Information' },
  { to: '/member/payments', label: 'Payments' },
  { to: '/member/submit', label: 'Submit District Info' },
]

// Shared by both full Admins and Category Admins — row-level security
// automatically scopes what a Category Admin sees on these pages.
const staffLinks = [
  { to: '/admin', label: 'Overview', end: true },
  { to: '/admin/members', label: 'Members' },
  { to: '/admin/payments', label: 'Verify Payments' },
]

// Full Admin only — association-wide, not category-scoped.
const fullAdminLinks = [
  { to: '/admin/modules/schools', label: 'Schools' },
  { to: '/admin/modules/commissioners', label: 'Commissioners' },
  { to: '/admin/modules/trainers', label: 'Trainers' },
  { to: '/admin/modules/scout_leaders', label: 'Scout Leaders' },
  { to: '/admin/modules/rover_scouts', label: 'Rover Scouts' },
  { to: '/admin/modules/donors', label: 'Donors' },
  { to: '/admin/modules/district_leadership', label: 'District Leadership' },
  { to: '/admin/modules/district_subscriptions', label: 'District Subscriptions' },
  { to: '/admin/category-admins', label: 'Category Admins' },
]

export default function Layout({ children, area }) {
  const { profile, isAdmin, isCategoryAdmin, managedCategory, signOut } = useAuth()
  const navigate = useNavigate()

  let links = memberLinks
  if (area === 'admin') {
    links = isAdmin ? [...staffLinks, ...fullAdminLinks] : staffLinks
  }

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-canvas">
      <aside className="md:w-64 shrink-0 bg-forest text-canvas flex flex-col">
        {/* Mobile-only top bar — brand + a always-visible Sign Out button.
            Without this, small screens never showed a way to log out. */}
        <div className="flex md:hidden items-center justify-between px-4 py-3 border-b border-canvas/10">
          <div>
            <div className="font-display font-bold text-base leading-tight">The USA</div>
            {isCategoryAdmin && (
              <div className="text-[10px] opacity-80 mt-0.5">Category Admin — {managedCategory}</div>
            )}
          </div>
          <button
            onClick={handleSignOut}
            className="text-xs font-semibold bg-ember text-canvas px-3 py-1.5 rounded-lg shrink-0"
          >
            Sign Out
          </button>
        </div>

        <div className="p-5 border-b border-canvas/10 hidden md:block">
          <div className="font-display font-bold text-lg leading-tight">The USA</div>
          <div className="text-xs opacity-70 mt-0.5">Uganda Scouts Association</div>
          {isCategoryAdmin && (
            <div className="text-xs mt-2 bg-ember/20 text-ember-light rounded px-2 py-1 inline-block">
              Category Admin — {managedCategory}
            </div>
          )}
        </div>

        <nav className="flex md:flex-col overflow-x-auto md:overflow-visible p-2 md:p-3 gap-1 flex-1">
          {links.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `px-3.5 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  isActive ? 'bg-ember text-canvas' : 'text-canvas/85 hover:bg-forest-dark'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-canvas/10 hidden md:block">
          <div className="text-xs opacity-70 mb-2 truncate">{profile?.name}</div>
          <Button variant="secondary" className="w-full" onClick={handleSignOut}>Sign Out</Button>
        </div>
      </aside>
      <main className="flex-1 p-4 md:p-8 max-w-6xl">{children}</main>
    </div>
  )
}
