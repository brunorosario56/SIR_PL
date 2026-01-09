import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import { usePresence } from "./hooks/usePresence";
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import SchedulePage from "./pages/SchedulePage";
import GroupsPage from "./pages/GroupsPage";
import ColegasPage from "./pages/ColegasPage";
import AppShell, { type NavKey } from "./components/AppShell";
import type { PresenceEntry } from "./api/types";

const navRoutes: Record<NavKey, string> = {
  dashboard: "/",
  schedule: "/schedule",
  groups: "/groups",
  colegas: "/colegas",
};

function navKeyFromPath(pathname: string): NavKey {
  if (pathname.startsWith("/schedule")) return "schedule";
  if (pathname.startsWith("/groups")) return "groups";
  if (pathname.startsWith("/colegas")) return "colegas";
  return "dashboard";
}

export type AppOutletContext = { presence: Record<string, PresenceEntry> };

function PrivateLayout() {
  const { user, loading, token, logout } = useAuth();
  const { presence } = usePresence(token);
  const location = useLocation();
  const navigate = useNavigate();

  if (loading) return <div className="p-6">A carregar…</div>;
  if (!user) return <Navigate to="/login" replace />;

  const active = navKeyFromPath(location.pathname);

  return (
    <AppShell
      active={active}
      onChange={(key) => navigate(navRoutes[key])}
      onLogout={() => {
        logout();
        navigate("/login", { replace: true });
      }}
    >
      <Outlet context={{ presence }} />
    </AppShell>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<PrivateLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="dashboard" element={<Navigate to="/" replace />} />
          <Route path="schedule" element={<SchedulePage />} />
          <Route path="groups" element={<GroupsPage />} />
          <Route path="colegas" element={<ColegasPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
