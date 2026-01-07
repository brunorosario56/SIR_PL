import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";

function Private({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-6">A carregar…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <Private>
              <Dashboard />
            </Private>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

