import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { Button, Card, Input, Label } from "../components/ui";

export default function LoginPage() {
  const { login, register } = useAuth();
  const nav = useNavigate();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(nome, email, password);
      }
      nav("/", { replace: true });
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Erro. Verifica as credenciais.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-950 to-black text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-6">
          <div className="text-3xl font-semibold">Classmate Sync</div>
          <div className="text-white/60 text-sm">Login + horários + grupos + slots comuns + eventos</div>
        </div>

        <Card>
          <div className="flex gap-2 mb-4">
            <button
              className={`flex-1 rounded-xl px-3 py-2 text-sm border ${mode === "login" ? "bg-white text-black border-white" : "border-white/10 hover:bg-white/10"}`}
              onClick={() => setMode("login")}
              type="button"
            >
              Entrar
            </button>
            <button
              className={`flex-1 rounded-xl px-3 py-2 text-sm border ${mode === "register" ? "bg-white text-black border-white" : "border-white/10 hover:bg-white/10"}`}
              onClick={() => setMode("register")}
              type="button"
            >
              Registar
            </button>
          </div>

          <form onSubmit={onSubmit} className="space-y-3">
            {mode === "register" && (
              <div>
                <Label>Nome</Label>
                <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="O teu nome" />
              </div>
            )}

            <div>
              <Label>Email</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" />
            </div>

            <div>
              <Label>Password</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>

            {err && <div className="text-sm text-red-300">{err}</div>}

            <Button className="w-full" disabled={busy}>
              {busy ? "A processar..." : mode === "login" ? "Entrar" : "Criar conta"}
            </Button>
          </form>
        </Card>

        <div className="text-xs text-white/50 mt-4">
          Dica: confirma no backend se CORS está a aceitar o origin do Vite.
        </div>
      </div>
    </div>
  );
}
