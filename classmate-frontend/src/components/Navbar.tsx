import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function onLogout() {
    logout();
    navigate("/login");
  }

  return (
    <header className="border-b bg-white">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="font-semibold">
          ClassMate Sync
        </Link>

        {user ? (
          <nav className="flex items-center gap-4">
            <NavLink className="text-sm" to="/schedule">Horário</NavLink>
            <NavLink className="text-sm" to="/compare">Comparar</NavLink>
            <NavLink className="text-sm" to="/colleagues">Colegas</NavLink>

            <span className="text-xs text-gray-600 hidden sm:inline">
              {user.email || user.nome || "Utilizador"}
            </span>

            <button
              onClick={onLogout}
              className="text-sm px-3 py-1.5 rounded border hover:bg-gray-50"
            >
              Sair
            </button>
          </nav>
        ) : (
          <nav className="flex items-center gap-3">
            <NavLink className="text-sm" to="/login">Login</NavLink>
            <NavLink className="text-sm" to="/register">Registo</NavLink>
          </nav>
        )}
      </div>
    </header>
  );
}

