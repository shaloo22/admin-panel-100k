import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router';
import {
  ArrowUpRight,
  IndianRupee,
  RefreshCw,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
  UserX,
} from 'lucide-react';
import { fetchStats } from '../api/users';
import { formatCompactCurrency, formatCurrency } from '../utils/format';
import ScooterLoader from '../component/ScooterLoader';

// Colors for each card theme (full class names, so Tailwind can find them)
const THEMES = {
  indigo: {
    soft: 'bg-brand-100',
    icon: 'bg-brand-100 text-brand-600',
    text: 'text-brand-600',
  },
  emerald: {
    soft: 'bg-emerald-100',
    icon: 'bg-emerald-100 text-emerald-600',
    text: 'text-emerald-600',
  },
  violet: {
    soft: 'bg-accent-100',
    icon: 'bg-accent-100 text-accent-600',
    text: 'text-accent-600',
  },
  sky: {
    soft: 'bg-sky-100',
    icon: 'bg-sky-100 text-sky-600',
    text: 'text-sky-600',
  },
  amber: {
    soft: 'bg-amber-100',
    icon: 'bg-amber-100 text-amber-600',
    text: 'text-amber-600',
  },
  rose: {
    soft: 'bg-rose-100',
    icon: 'bg-rose-100 text-rose-600',
    text: 'text-rose-600',
  },
};

// Colors used inside the donut chart (SVG needs real color codes)
const STATUS_COLORS = {
  active: '#10b981',
  inactive: '#f59e0b',
  banned: '#f43f5e',
};

// Big KPI card: icon, label, number and a small hint
function KpiCard({ label, value, hint, to, icon: Icon, theme }) {
  const t = THEMES[theme];

  const card = (
    <div className="relative h-full overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      {/* Soft circle in the corner, just for decoration */}
      <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-60 ${t.soft}`} />

      <div className="relative">
        <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-lg ${t.icon}`}>
          <Icon size={20} />
        </div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </p>
        <p className="mt-1 text-3xl font-bold tabular-nums text-slate-900">{value}</p>
        {hint && <p className={`mt-2 text-xs font-medium ${t.text}`}>{hint}</p>}
      </div>
    </div>
  );

  // If the card has a link, wrap it so the user can click it
  if (!to) return card;
  return (
    <Link to={to} className="block h-full rounded-xl transition hover:-translate-y-0.5 hover:shadow-md">
      {card}
    </Link>
  );
}

// Smaller card used for quick insights
function InsightTile({ label, value, hint, to, icon: Icon, theme }) {
  const t = THEMES[theme];

  const tile = (
    <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${t.icon}`}>
        <Icon size={22} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </p>
        <p className="text-2xl font-bold tabular-nums text-slate-900">{value}</p>
        {hint && <p className="text-xs text-slate-400">{hint}</p>}
      </div>
      {to && <ArrowUpRight size={18} className="text-slate-300" />}
    </div>
  );

  if (!to) return tile;
  return (
    <Link to={to} className="block rounded-xl transition hover:-translate-y-0.5 hover:shadow-md">
      {tile}
    </Link>
  );
}

// White box with a title, used for charts and lists
function Panel({ title, subtitle, className = '', children }) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

// Bar chart: one bar per month. Bar height is relative to the biggest month.
function SignupsChart({ rows }) {
  const max = Math.max(...rows.map((row) => row.count), 1);

  return (
    <div className="flex h-52 gap-3">
      {rows.map((row) => (
        <div key={row.label} className="flex flex-1 flex-col">
          <div className="flex flex-1 flex-col items-center justify-end gap-1">
            <span className="text-xs font-medium text-slate-600">
              {row.count.toLocaleString('en-IN')}
            </span>
            <div
              className="w-full rounded-t-md bg-linear-to-t from-brand-600 to-brand-300"
              style={{ height: `${(row.count / max) * 80}%`, minHeight: 4 }}
              title={`${row.label}: ${row.count} signups`}
            />
          </div>
          <span className="mt-2 text-center text-xs text-slate-400">{row.label}</span>
        </div>
      ))}
    </div>
  );
}

// Donut chart made with SVG circles. Each circle is one slice.
function StatusDonut({ rows, total }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  let used = 0; // how much of the circle is already filled

  return (
    <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
      {/* Grey ring in the background */}
      <circle cx="50" cy="50" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="12" />

      {rows.map((row) => {
        const length = (row.count / total) * circumference;
        const slice = (
          <circle
            key={row.status}
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={STATUS_COLORS[row.status] || '#94a3b8'}
            strokeWidth="12"
            strokeDasharray={`${length} ${circumference - length}`}
            strokeDashoffset={-used}
          />
        );
        used += length;
        return slice;
      })}
    </svg>
  );
}

function DashboardPage() {
  const queryClient = useQueryClient();

  const { data, isLoading, isFetching, isError, error } = useQuery({
    queryKey: ['stats'],
    queryFn: ({ signal }) => fetchStats(signal),
  });

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Show a count as a percentage of all users, like 70.1
  const percent = (count) =>
    data ? ((count / data.total_users) * 100).toFixed(1) : '0';

  // Used to draw the progress bars in "Top cities"
  const topCities = data?.topCities ?? [];
  const maxCityRevenue = Math.max(...topCities.map((city) => Number(city.revenue)), 1);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['stats'] });

  return (
    <div>
      {/* Banner */}
      <div className="relative mb-6 overflow-hidden rounded-2xl bg-sidebar bg-linear-to-r from-sidebar via-brand-900 to-brand-600 p-6 text-white shadow-md">
        <div className="dot-pattern absolute inset-0" />

        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Dashboard</h2>
            <p className="mt-1 text-sm text-brand-200">
              Overview of your users and revenue · {today}
            </p>
          </div>

          <button className="refresh-btn" onClick={refresh} disabled={isFetching}>
            <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {data && (
          <div className="relative mt-5 flex flex-wrap gap-3">
            {[
              `${data.total_users.toLocaleString('en-IN')} users`,
              `${percent(data.active_users)}% active`,
              `${formatCompactCurrency(data.total_revenue)} revenue`,
            ].map((text) => (
              <span
                key={text}
                className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-brand-50"
              >
                {text}
              </span>
            ))}
          </div>
        )}
      </div>

      {isLoading && <ScooterLoader />}
      {isError && <p className="error">{error.message}</p>}

      {data && (
        <>
          {/* Row 1: main KPI cards */}
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Total users"
              value={data.total_users.toLocaleString('en-IN')}
              hint="View all users"
              to="/users"
              icon={Users}
              theme="indigo"
            />
            <KpiCard
              label="Active users"
              value={data.active_users.toLocaleString('en-IN')}
              hint={`${percent(data.active_users)}% of all users`}
              to="/users?status=active"
              icon={UserCheck}
              theme="emerald"
            />
            <KpiCard
              label="Total revenue"
              value={formatCompactCurrency(data.total_revenue)}
              hint={formatCurrency(data.total_revenue)}
              icon={IndianRupee}
              theme="violet"
            />
            <KpiCard
              label="Avg revenue / paying user"
              value={formatCurrency(data.avg_revenue)}
              hint="Users with revenue above 0"
              icon={TrendingUp}
              theme="sky"
            />
          </div>

          {/* Row 2: signups chart and status donut */}
          <div className="mt-6 grid gap-5 lg:grid-cols-3">
            <Panel
              title="New signups"
              subtitle="Last 6 months"
              className="lg:col-span-2"
            >
              <SignupsChart rows={data.signupsByMonth} />
            </Panel>

            <Panel title="Users by status" subtitle="Share of all users">
              <div className="flex flex-wrap items-center gap-6">
                <div className="relative h-40 w-40 shrink-0">
                  <StatusDonut rows={data.byStatus} total={data.total_users} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-slate-900">
                      {percent(data.active_users)}%
                    </span>
                    <span className="text-xs text-slate-400">active</span>
                  </div>
                </div>

                <ul className="flex min-w-40 flex-1 flex-col gap-3">
                  {data.byStatus.map((row) => (
                    <li key={row.status} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 capitalize text-slate-700">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: STATUS_COLORS[row.status] || '#94a3b8' }}
                        />
                        {row.status}
                      </span>
                      <span className="text-slate-500">
                        {row.count.toLocaleString('en-IN')} ({percent(row.count)}%)
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </Panel>
          </div>

          {/* Row 3: top cities and quick insights */}
          <div className="mt-6 grid gap-5 lg:grid-cols-3">
            <Panel
              title="Top cities by revenue"
              subtitle="Top 5 cities"
              className="lg:col-span-2"
            >
              <ul className="flex flex-col gap-4">
                {topCities.map((city, index) => (
                  <li key={city.city}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700">
                        {index + 1}. {city.city}
                      </span>
                      <span className="text-slate-500">
                        {formatCompactCurrency(city.revenue)} ·{' '}
                        {city.users.toLocaleString('en-IN')} users
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div
                        className="h-2 rounded-full bg-linear-to-r from-brand-400 to-brand-600"
                        style={{ width: `${(Number(city.revenue) / maxCityRevenue) * 100}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </Panel>

            <div className="flex flex-col gap-5">
              <InsightTile
                label="New this month"
                value={data.new_this_month.toLocaleString('en-IN')}
                hint="Signups since the 1st"
                icon={UserPlus}
                theme="amber"
              />
              <InsightTile
                label="Never logged in"
                value={data.never_logged_in.toLocaleString('en-IN')}
                hint={`${percent(data.never_logged_in)}% of all users`}
                to="/users?neverLoggedIn=true"
                icon={UserX}
                theme="rose"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default DashboardPage;