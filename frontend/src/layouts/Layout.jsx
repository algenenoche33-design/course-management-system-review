import { Link, Outlet } from 'react-router-dom'

const navLinks = [
  { to: '/courses', label: 'Courses' },
  { to: '/my-courses', label: 'My Courses' },
  { to: '/instructor', label: 'Instructor' },
]

export default function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-gray-200">
        <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/courses" className="text-lg font-semibold text-gray-900">
            CMS
          </Link>
          <ul className="flex items-center gap-6">
            {navLinks.map((link) => (
              <li key={link.to}>
                <Link to={link.to} className="text-sm text-gray-600 hover:text-gray-900">
                  {link.label}
                </Link>
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
