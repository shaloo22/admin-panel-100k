import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Eye,
  EyeOff,
  Gauge,
  LockKeyhole,
  Mail,
  Search,
  Sparkles,
  Undo2,
} from 'lucide-react';
import { DEMO_SESSION_KEY } from '../config';

const APP_NAME = 'UserDesk';
const DEMO_EMAIL = 'demo@userdesk.dev';
const DEMO_PASSWORD = 'demo1234';

const FEATURES = [
  { icon: Gauge, text: '100,000+ records with virtualized scrolling' },
  { icon: Search, text: 'Server-side search, filters and sorting' },
  { icon: Sparkles, text: 'AI natural-language filter' },
  { icon: Undo2, text: 'Inline editing with undo and redo' },
];

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState(DEMO_EMAIL);
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  // Mark the visitor as "inside" and open the dashboard
  const enterDemo = () => {
    localStorage.setItem(DEMO_SESSION_KEY, 'true');
    navigate('/', { replace: true });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const ok =
      email.trim().toLowerCase() === DEMO_EMAIL && password === DEMO_PASSWORD;

    if (ok) {
      enterDemo();
    } else {
      setError('Please use the demo credentials shown on this page.');
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left: brand panel (hidden on phones) */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-sidebar bg-linear-to-br from-sidebar via-brand-900 to-brand-700 p-10 text-white lg:flex">
        <div className="dot-pattern absolute inset-0" />

        <div className="relative flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-400 text-base font-extrabold text-sidebar">
            {APP_NAME[0]}
          </div>
          <span className="text-lg font-semibold tracking-wide">{APP_NAME}</span>
        </div>

        <div className="relative">
          <h2 className="text-3xl font-bold leading-tight">
            Manage thousands of users,
            <br />
            without the lag.
          </h2>

          <ul className="mt-8 space-y-4">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-brand-100">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
                  <Icon size={18} strokeWidth={1.75} />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-brand-300/70">
          React · Node.js · PostgreSQL
        </p>
      </div>

      {/* Right: login form */}
      <div className="flex items-center justify-center bg-canvas p-5">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-bold text-slate-900">Welcome to {APP_NAME}</h1>
          <p className="mt-1 text-sm text-slate-500">
            Demo environment. No account needed.
          </p>

          <button className="btn-primary mt-6" onClick={enterDemo}>
            Continue as Demo Admin
          </button>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs text-slate-400">or sign in with demo credentials</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Email
              </label>
              <div className="login-field">
                <Mail size={18} className="text-slate-400" />
                <input
                  type="email"
                  required
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-transparent py-2.5 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Password
              </label>
              <div className="login-field">
                <LockKeyhole size={18} className="text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-transparent py-2.5 outline-none"
                />
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && <p className="text-sm text-rose-600">{error}</p>}

            <button type="submit" className="btn-ghost">
              Sign in
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-400">
            Demo project. Sample data, no real accounts.
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;