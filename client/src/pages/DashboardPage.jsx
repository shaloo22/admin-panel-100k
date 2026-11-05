import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import {
  IndianRupee,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
  UserX,
} from 'lucide-react';
import { fetchStats } from '../api/users';
import { formatCompactCurrency, formatCurrency } from '../utils/format';
import ScooterLoader from '../component/ScooterLoader';

const THEMES = {
  indigo: {
    top: 'border-t-indigo-500',
    icon: 'bg-indigo-100 text-indigo-600',
    pill: 'bg-indigo-50 text-indigo-700',
  },
  emerald: {
    top: 'border-t-emerald-500',
    icon: 'bg-emerald-100 text-emerald-600',
    pill: 'bg-emerald-50 text-emerald-700',
  },
  violet: {
    top: 'border-t-violet-500',
    icon: 'bg-violet-100 text-violet-600',
    pill: 'bg-violet-50 text-violet-700',
  },
  sky: {
    top: 'border-t-sky-500',
    icon: 'bg-sky-100 text-sky-600',
    pill: 'bg-sky-50 text-sky-700',
  },
  amber: {
    top: 'border-t-amber-500',
    icon: 'bg-amber-100 text-amber-600',
    pill: 'bg-amber-50 text-amber-700',
  },
  rose: {
    top: 'border-t-rose-500',
    icon: 'bg-rose-100 text-rose-600',
    pill: 'bg-rose-50 text-rose-700',
  },
};

const STATUS_COLORS = {
  active: 'bg-emerald-500',
  inactive: 'bg-amber-500',
  banned: 'bg-rose-500',
};

function StatCard({ label, value, hint, to, icon: Icon, theme }) {
  const t = THEMES[theme];
  const Wrapper = to ? Link : 'div';
  const wrapperProps = to ? { to } : {};

  return (
    <Wrapper
      {...wrapperProps}
      className="block rounded-xl transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div
        className={`rounded-xl border border-t-4 border-slate-200 bg-white p-5 shadow-sm ${t.top}`}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">{label}</p>
            <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>
          </div>
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-xl ${t.icon}`}
          >
            <Icon size={22} />
          </div>
        </div>
        {hint && (
          <p
            className={`mt-3 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${t.pill}`}
          >
            {hint}
          </p>
        )}
      </div>
    </Wrapper>
  );
}

function Panel({ title, dot, children }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
        <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
        {title}
      </h3>
      {children}
    </div>
  );
}

function DashboardPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['stats'],
    queryFn: ({ signal }) => fetchStats(signal),
  });

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const percent = (count) =>
    data ? ((count / data.total_users) * 100).toFixed(1) : '0';

  return (
    <div>
      <div className="mb-6 rounded-2xl bg-indigo-600 bg-linear-to-r from-indigo-600 via-violet-600 to-fuchsia-500 p-6 text-white shadow-md">
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <p className="mt-1 text-sm text-indigo-100">
          Overview of your users and revenue · {today}
        </p>
      </div>

      {isLoading && <ScooterLoader />}
      {isError && <p className="error">{error.message}</p>}

      {data && (
        <>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard
              label="Total users"
              value={data.total_users.toLocaleString('en-IN')}
              hint="View all users"
              to="/users"
              icon={Users}
              theme="indigo"
            />
            <StatCard
              label="Active users"
              value={data.active_users.toLocaleString('en-IN')}
              hint={`${percent(data.active_users)}% of all users`}
              to="/users?status=active"
              icon={UserCheck}
              theme="emerald"
            />
            <StatCard
              label="Total revenue"
              value={formatCompactCurrency(data.total_revenue)}
              hint={formatCurrency(data.total_revenue)}
              icon={IndianRupee}
              theme="violet"
            />
            <StatCard
              label="Avg revenue / paying user"
              value={formatCurrency(data.avg_revenue)}
              icon={TrendingUp}
              theme="sky"
            />
            <StatCard
              label="New this month"
              value={data.new_this_month.toLocaleString('en-IN')}
              icon={UserPlus}
              theme="amber"
            />
            <StatCard
              label="Never logged in"
              value={data.never_logged_in.toLocaleString('en-IN')}
              hint={`${percent(data.never_logged_in)}% of all users`}
              to="/users?neverLoggedIn=true"
              icon={UserX}
              theme="rose"
            />
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <Panel title="Users by status" dot="bg-emerald-500">
              <div className="flex flex-col gap-4">
                {data.byStatus.map((row) => (
                  <div key={row.status}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="font-medium capitalize">{row.status}</span>
                      <span className="text-slate-500">
                        {row.count.toLocaleString('en-IN')} ({percent(row.count)}%)
                      </span>
                    </div>
                    <div className="h-2.5 rounded-full bg-slate-100">
                      <div
                        className={`h-2.5 rounded-full ${STATUS_COLORS[row.status] || 'bg-slate-400'}`}
                        style={{ width: `${percent(row.count)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Top cities by revenue" dot="bg-violet-500">
              <table>
                <thead>
                  <tr>
                    <th>City</th>
                    <th className="num">Users</th>
                    <th className="num">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topCities.map((row) => (
                    <tr key={row.city}>
                      <td>{row.city}</td>
                      <td className="num">{row.users.toLocaleString('en-IN')}</td>
                      <td className="num">{formatCompactCurrency(row.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}

export default DashboardPage;