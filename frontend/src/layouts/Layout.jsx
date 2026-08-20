import { Link, NavLink, Outlet } from 'react-router-dom'

const navLinks = [
  { to: '/courses', label: 'Courses' },
  { to: '/my-courses', label: 'My Courses' },
  { to: '/instructor', label: 'Instructor' },
]

export default function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="bg-primary">
        <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/courses" className="text-lg font-semibold text-white">
            CMS
          </Link>
          <ul className="flex items-center gap-6">
            {navLinks.map((link) => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  className={({ isActive }) =>
                    `border-b-2 pb-0.5 text-sm font-medium transition-colors ${
                      isActive
                        ? 'border-accent text-white'
                        : 'border-transparent text-white/70 hover:text-white'
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
