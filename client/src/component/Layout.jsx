
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router';
import {
  Gauge,
  LayoutDashboard,
  Menu,
  Users,
  LogOut,
} from 'lucide-react';
import NotificationBell from './NotificationBell';

const APP_NAME = 'UserDesk';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/users', label: 'Users', icon: Users },
  { to: '/lab', label: 'Performance Lab', icon: Gauge },
];

function readCollapsed() {
  try {
    const saved = localStorage.getItem('sidebarCollapsed');
    if (saved !== null) return saved === 'true';
  } catch {}
  return window.innerWidth < 1024;
}

function Layout() {
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const navigate = useNavigate();

  useEffect(() => {
    try {
      localStorage.setItem('sidebarCollapsed', String(collapsed));
    } catch {}
  }, [collapsed]);

  const handleLogout = () => {
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-canvas text-slate-800">
      <aside
        className={`flex shrink-0 flex-col overflow-hidden bg-sidebar text-brand-100 transition-[width] duration-200 ${
          collapsed ? 'w-16' : 'w-60'
        }`}
      >
        <div className="flex h-14 items-center gap-3 whitespace-nowrap border-b border-white/10 px-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-400 text-sm font-extrabold text-sidebar">
            {APP_NAME[0]}
          </div>
          <span className="text-base font-semibold tracking-wide text-white">
            {APP_NAME}
          </span>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3 pt-4">
          {!collapsed && (
            <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-widest text-brand-300/60">
              Menu
            </p>
          )}

          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              title={label}
              className={({ isActive }) =>
                `flex items-center gap-3 overflow-hidden whitespace-nowrap rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-sidebar-active text-white shadow-[inset_3px_0_0_var(--color-accent-400)]'
                    : 'text-brand-100/80 hover:bg-sidebar-hover hover:text-white'
                }`
              }
            >
              <Icon size={20} strokeWidth={1.75} className="shrink-0" />
              {!collapsed && label}
            </NavLink>
          ))}

          <button
            onClick={handleLogout}
            title="Logout"
            className="mt-auto mb-4 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-brand-100/80 transition-colors hover:bg-sidebar-hover hover:text-white"
          >
            <LogOut size={20} className="shrink-0" />
            {!collapsed && 'Logout'}
          </button>
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4">
          <div className="flex items-center gap-3">
            <button
              className="icon-btn"
              onClick={() => setCollapsed((c) => !c)}
              aria-label="Toggle sidebar"
              title="Toggle sidebar"
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

        <main className="min-w-0 flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default Layout;
