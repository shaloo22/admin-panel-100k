import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router';
import { Gauge, LayoutDashboard, Menu, Users } from 'lucide-react';
import NotificationBell from './NotificationBell';

// Change the app name here, it shows in the sidebar
const APP_NAME = 'UserDesk';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/users', label: 'Users', icon: Users },
  { to: '/lab', label: 'Performance Lab', icon: Gauge },
];

function readCollapsed() {
  try {
    const saved = localStorage.getItem('sidebarCollapsed');
    if (saved !== null) return saved === 'true';
  } catch {
    // storage can be blocked, then we use the default below
  }
  return window.innerWidth < 1024;
}

function Layout() {
  // collapsed = small icon sidebar on desktop
  // mobileOpen = slide-in menu on a phone
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Remember the desktop sidebar choice after refresh
  useEffect(() => {
    try {
      localStorage.setItem('sidebarCollapsed', String(collapsed));
    } catch {
      // ignore
    }
  }, [collapsed]);

  const toggleMenu = () => {
    // Desktop: shrink to icons. Phone: slide the menu in or out.
    if (window.matchMedia('(min-width: 768px)').matches) {
      setCollapsed((c) => !c);
    } else {
      setMobileOpen((o) => !o);
    }
  };

  // Hide the text only on desktop when the sidebar is collapsed
  const hideWhenCollapsed = collapsed ? 'md:hidden' : '';

  return (
    <div className="flex min-h-screen bg-canvas text-slate-800">
      {/* Dark background behind the menu on a phone */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-60 shrink-0 flex-col overflow-hidden bg-sidebar text-brand-100 transition-all duration-200 md:static md:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } ${collapsed ? 'md:w-16' : 'md:w-60'}`}
      >
        {/* Logo */}
        <div className="flex h-14 items-center gap-3 whitespace-nowrap border-b border-white/10 px-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-400 text-sm font-extrabold text-sidebar">
            {APP_NAME[0]}
          </div>
          <span
            className={`text-base font-semibold tracking-wide text-white ${hideWhenCollapsed}`}
          >
            {APP_NAME}
          </span>
        </div>

        {/* Menu */}
        <nav className="flex flex-col gap-1 px-3 pt-4">
          <p
            className={`px-3 pb-1 text-[11px] font-semibold uppercase tracking-widest text-brand-300/60 ${hideWhenCollapsed}`}
          >
            Menu
          </p>

          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              title={label}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 overflow-hidden whitespace-nowrap rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-sidebar-active text-white shadow-[inset_3px_0_0_var(--color-accent-400)]'
                    : 'text-brand-100/80 hover:bg-sidebar-hover hover:text-white'
                }`
              }
            >
              <Icon size={20} strokeWidth={1.75} className="shrink-0" />
              <span className={hideWhenCollapsed}>{label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-3 sm:px-4">
          <div className="flex items-center gap-3">
            <button
              className="icon-btn"
              onClick={toggleMenu}
              aria-label="Toggle menu"
              title="Toggle menu"
            >
              <Menu size={20} strokeWidth={1.75} />
            </button>
            <span className="text-sm font-semibold text-slate-600">
              Admin Panel
            </span>
          </div>

          <div className="flex items-center gap-3">
            <NotificationBell />
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-linear-to-br from-brand-500 to-brand-700 text-sm font-semibold text-white">
              A
            </div>
          </div>
        </header>

        <main className="min-w-0 flex-1 p-3 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default Layout;