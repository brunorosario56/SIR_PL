import React, { useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import SchedulePage from "./pages/SchedulePage";
import GroupsPage from "./pages/GroupsPage";
import ColegasPage from "./pages/ColegasPage";
import AppShell, { type NavKey } from "./components/AppShell";

function Private({ children }: { children: React.ReactElement }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-6">A carregar…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const [active, setActive] = useState<NavKey>("" as NavKey);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route
          path="/*"
          element={
            <Private>
              <AppShell active={active} onChange={setActive}>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/schedule" element={<SchedulePage />} />
                  <Route path="/groups" element={<GroupsPage />} />
                  <Route path="/colegas" element={<ColegasPage presence={{}} />} />
                </Routes>
              </AppShell>
            </Private>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}