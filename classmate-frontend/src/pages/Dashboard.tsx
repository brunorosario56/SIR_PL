import { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { Card, Pill } from "../components/ui";
import { useAuth } from "../auth/AuthContext";
import type { AppOutletContext } from "../App";
import { getMyGroups, getMySchedule } from "../api/endpoints";

export default function Dashboard() {
  const { user } = useAuth();
  const { presence } = useOutletContext<AppOutletContext>();
  const navigate = useNavigate();

  const [counts, setCounts] = useState({ blocos: 0, grupos: 0 });

  useEffect(() => {
    (async () => {
      try {
        const [s, g] = await Promise.all([getMySchedule(), getMyGroups()]);
        setCounts({ blocos: s.blocos?.length || 0, grupos: g.length || 0 });
      } catch {
        // ignora
      }
    })();
  }, []);

  const mePresence = useMemo(() => (user?._id ? presence[user._id] : undefined), [presence, user?._id]);

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xl font-semibold">Overview</div>
        <div className="text-white/60 text-sm">Resumo rápido do teu estado</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <div className="text-sm text-white/60">Horário</div>
          <div className="text-2xl font-semibold">{counts.blocos}</div>
          <div className="text-xs text-white/50">blocos registados</div>
        </Card>

        <Card>
          <div className="text-sm text-white/60">Grupos</div>
          <div className="text-2xl font-semibold">{counts.grupos}</div>
          <div className="text-xs text-white/50">onde és membro</div>
        </Card>

        <Card>
          <div className="text-sm text-white/60">Presença</div>
          <div className="mt-2">
            <Pill className={mePresence?.online ? "text-green-200" : "text-white/70"}>
              {mePresence?.online ? "Online" : "Offline"}
            </Pill>
          </div>
          {mePresence?.lastSeen && (
            <div className="text-xs text-white/50 mt-2">
              lastSeen: {new Date(mePresence.lastSeen).toLocaleString()}
            </div>
          )}
        </Card>
      </div>

      <Card>
        <div className="text-sm text-white/60 mb-2">Atalhos</div>
        <div className="flex flex-wrap gap-2">
          <button className="rounded-xl border border-white/10 px-3 py-2 hover:bg-white/10" onClick={() => navigate("/schedule")}>
            Editar horário
          </button>
          <button className="rounded-xl border border-white/10 px-3 py-2 hover:bg-white/10" onClick={() => navigate("/groups")}>
            Ver grupos
          </button>
          <button className="rounded-xl border border-white/10 px-3 py-2 hover:bg-white/10" onClick={() => navigate("/colegas")}>
            Colegas
          </button>
        </div>
      </Card>
    </div>
  );
}
