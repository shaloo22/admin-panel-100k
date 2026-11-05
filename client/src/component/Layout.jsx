import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router';
import { LayoutDashboard, Users, Gauge, Menu } from 'lucide-react';
import NotificationBell from './NotificationBell';

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
    // storage band ho to default chalega
  }
  return window.innerWidth < 1024;
}

function Layout() {
  const [collapsed, setCollapsed] = useState(readCollapsed);

  useEffect(() => {
    try {
      localStorage.setItem('sidebarCollapsed', String(collapsed));
    } catch {
      // ignore
    }
  }, [collapsed]);

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800">
      <aside
        className={`flex shrink-0 flex-col overflow-hidden bg-slate-900 text-slate-200 transition-[width] duration-200 ${
          collapsed ? 'w-16' : 'w-60'
        }`}
      >
        <div className="flex h-14 items-center whitespace-nowrap px-5 text-lg font-bold text-white">
          {collapsed ? 'A' : 'AdminPanel'}
        </div>
        <nav className="flex flex-col gap-1 px-3">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              title={label}
              className={({ isActive }) =>
                `flex items-center gap-3 overflow-hidden whitespace-nowrap rounded-md px-3 py-2 text-sm transition-colors ${
                  isActive ? 'bg-slate-700 text-white' : 'hover:bg-slate-800'
                }`
              }
            >
              <Icon size={18} className="shrink-0" />
              {!collapsed && label}
            </NavLink>
          ))}
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
              <Menu size={20} />
            </button>
            <span className="text-sm font-semibold text-slate-600">
              Admin Panel
            </span>
          </div>
                    <div className="flex items-center gap-3">
            <NotificationBell />
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-sm font-semibold text-white">
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