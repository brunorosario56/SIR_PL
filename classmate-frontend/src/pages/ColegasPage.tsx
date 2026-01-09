import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { addColega, getMyColegas } from "../api/endpoints";
import type { User } from "../api/types";
import { Button, Card, Input, Label, Pill } from "../components/ui";
import type { AppOutletContext } from "../App";

export default function ColegasPage() {
  const { presence } = useOutletContext<AppOutletContext>();
  const [colegas, setColegas] = useState<User[]>([]);
  const [email, setEmail] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setErr(null);
    try {
      const data = await getMyColegas();
      setColegas(data.colegas || []);
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Erro ao obter colegas.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  const sorted = useMemo(() => {
    return [...colegas].sort((a, b) => a.nome.localeCompare(b.nome));
  }, [colegas]);

  async function onAdd() {
    if (!email.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      await addColega(email.trim());
      setEmail("");
      await load();
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Erro ao adicionar colega.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xl font-semibold">Colegas</div>
        <div className="text-white/60 text-sm">Lista + presença (Socket.IO)</div>
      </div>

      {err && <div className="text-sm text-red-300">{err}</div>}

      <Card className="space-y-3">
        <div className="text-sm text-white/60">Adicionar colega por email</div>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2">
          <div>
            <Label>Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="colega@exemplo.com" />
          </div>
          <div className="flex items-end">
            <Button onClick={onAdd} disabled={busy}>
              {busy ? "A adicionar..." : "Adicionar"}
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <div className="text-sm text-white/60 mb-3">Colegas ({sorted.length})</div>
        <div className="space-y-2">
          {sorted.map((c) => {
            const p = presence[c._id];
            const online = p?.online;
            return (
              <div key={c._id} className="rounded-xl border border-white/10 bg-black/30 p-3 flex items-center justify-between">
                <div>
                  <div className="font-medium flex items-center gap-2">
                    {c.nome}
                    <Pill className={online ? "text-green-200" : "text-white/70"}>
                      {online ? "Online" : "Offline"}
                    </Pill>
                  </div>
                  <div className="text-xs text-white/60">{c.email}</div>
                  {!online && p?.lastSeen && (
                    <div className="text-xs text-white/40">lastSeen: {new Date(p.lastSeen).toLocaleString()}</div>
                  )}
                </div>
              </div>
            );
          })}

          {sorted.length === 0 && <div className="text-sm text-white/50">Ainda não tens colegas.</div>}
        </div>
      </Card>
    </div>
  );
}
