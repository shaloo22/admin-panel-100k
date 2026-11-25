import { Navigate, Outlet, Route, Routes } from 'react-router';
import Layout from './component/Layout';
import DashboardPage from './pages/DashboardPage';
import UsersPage from './pages/UsersPage';
import LoginPage from './pages/LoginPage';
import { DEMO_SESSION_KEY } from './config';
import './App.css';

// Visitors can enter after they click a demo button on the login page
function RequireDemo() {
  const inside = localStorage.getItem(DEMO_SESSION_KEY) === 'true';
  return inside ? <Outlet /> : <Navigate to="/login" replace />;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<RequireDemo />}>
        <Route element={<Layout />}>
          <Route index element={<DashboardPage />} />
          <Route path="users" element={<UsersPage />} />
        </Route>
      </Route>

      {/* Any unknown address goes to the dashboard */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;