import { useEffect, useMemo, useState } from "react";
import type { ScheduleBlock } from "../api/types";
import { getMySchedule, putMySchedule } from "../api/endpoints";
import { Button, Card, Input, Label } from "../components/ui";

const days = ["", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

function emptyBlock(): ScheduleBlock {
  return { disciplina: "", sala: "", diaSemana: 1, horaInicio: "09:00", horaFim: "10:00" };
}

export default function SchedulePage() {
  const [blocos, setBlocos] = useState<ScheduleBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [draft, setDraft] = useState<ScheduleBlock>(emptyBlock());

  useEffect(() => {
    (async () => {
      try {
        const data = await getMySchedule();
        setBlocos(data.blocos || []);
      } catch (e: any) {
        setErr(e?.response?.data?.message || "Erro ao carregar horário.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const sorted = useMemo(() => {
    return [...blocos].sort((a, b) => (a.diaSemana - b.diaSemana) || a.horaInicio.localeCompare(b.horaInicio));
  }, [blocos]);

  function addBlock() {
    if (!draft.disciplina.trim()) {
      setErr("Disciplina é obrigatória.");
      return;
    }
    setErr(null);
    setBlocos((prev) => [...prev, { ...draft, disciplina: draft.disciplina.trim(), sala: draft.sala?.trim() }]);
    setDraft(emptyBlock());
  }

  function removeIdx(idx: number) {
    setBlocos((prev) => prev.filter((_, i) => i !== idx));
  }

  async function saveAll() {
    setSaving(true);
    setErr(null);
    try {
      await putMySchedule(blocos);
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Erro ao guardar horário.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-2">A carregar…</div>;

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xl font-semibold">Horário</div>
        <div className="text-white/60 text-sm">Adiciona blocos e guarda para a API</div>
      </div>

      {err && <div className="text-sm text-red-300">{err}</div>}

      <Card className="space-y-3">
        <div className="text-sm text-white/60">Adicionar bloco</div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="md:col-span-2">
            <Label>Disciplina</Label>
            <Input value={draft.disciplina} onChange={(e) => setDraft((d) => ({ ...d, disciplina: e.target.value }))} />
          </div>

          <div>
            <Label>Sala</Label>
            <Input value={draft.sala || ""} onChange={(e) => setDraft((d) => ({ ...d, sala: e.target.value }))} />
          </div>

          <div>
            <Label>Dia (1..7)</Label>
            <Input
              type="number"
              min={1}
              max={7}
              value={draft.diaSemana}
              onChange={(e) => setDraft((d) => ({ ...d, diaSemana: Number(e.target.value) }))}
            />
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <Label>Início</Label>
              <Input value={draft.horaInicio} onChange={(e) => setDraft((d) => ({ ...d, horaInicio: e.target.value }))} placeholder="HH:MM" />
            </div>
            <div className="flex-1">
              <Label>Fim</Label>
              <Input value={draft.horaFim} onChange={(e) => setDraft((d) => ({ ...d, horaFim: e.target.value }))} placeholder="HH:MM" />
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={addBlock}>Adicionar</Button>
          <Button variant="ghost" onClick={saveAll} disabled={saving}>
            {saving ? "A guardar..." : "Guardar na API"}
          </Button>
        </div>
      </Card>

      <Card>
        <div className="text-sm text-white/60 mb-3">Blocos ({sorted.length})</div>
        <div className="space-y-2">
          {sorted.map((b, idx) => (
            <div key={idx} className="rounded-xl border border-white/10 bg-black/30 p-3 flex items-center justify-between gap-3">
              <div>
                <div className="font-medium">{b.disciplina}</div>
                <div className="text-xs text-white/60">
                  {days[b.diaSemana]} • {b.horaInicio}-{b.horaFim} {b.sala ? `• ${b.sala}` : ""}
                </div>
              </div>
              <Button variant="ghost" onClick={() => removeIdx(idx)}>
                Remover
              </Button>
            </div>
          ))}

          {sorted.length === 0 && <div className="text-sm text-white/50">Ainda não tens blocos.</div>}
        </div>
      </Card>
    </div>
  );
}
