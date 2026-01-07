import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register } from "../api/auth";

export default function Register() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      await register({ email, password, username: username || undefined });
      navigate("/login");
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? "Falha no registo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center px-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm border rounded-lg p-5 bg-white">
        <h1 className="text-xl font-semibold">Registo</h1>
        <p className="text-sm text-gray-600 mt-1">
          Já tens conta? <Link className="underline" to="/login">Faz login</Link>
        </p>

        {err && <div className="mt-3 text-sm text-red-600">{err}</div>}

        <label className="block mt-4 text-sm">
          Username (opcional)
          <input
            className="mt-1 w-full border rounded px-3 py-2"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </label>

        <label className="block mt-3 text-sm">
          Email
          <input
            className="mt-1 w-full border rounded px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
          />
        </label>

        <label className="block mt-3 text-sm">
          Password
          <input
            className="mt-1 w-full border rounded px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
          />
        </label>

        <button
          disabled={loading}
          className="mt-4 w-full rounded bg-black text-white py-2 text-sm disabled:opacity-60"
        >
          {loading ? "A criar..." : "Criar conta"}
        </button>
      </form>
    </div>
  );
}

