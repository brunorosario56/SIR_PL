import { useEffect, useMemo, useState } from "react";
import { addMembersToGroup, createGroupEvent, getGroupEvents, getGroupSlots, getMyGroups } from "../api/endpoints";
import { useAuth } from "../auth/AuthContext";
import type { Group, Slot, StudyEvent } from "../api/types";
import { Button, Card, Input, Label, Pill } from "../components/ui";

const days = ["", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

function isoNowPlus(hours: number) {
  const d = new Date();
  d.setHours(d.getHours() + hours);
  d.setMinutes(0, 0, 0);
  return d.toISOString().slice(0, 16); // para input datetime-local
}

export default function GroupsPage() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selected, setSelected] = useState<Group | null>(null);

  const [slots, setSlots] = useState<Slot[]>([]);
  const [events, setEvents] = useState<StudyEvent[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // add members
  const [emailsRaw, setEmailsRaw] = useState("");
  const [adding, setAdding] = useState(false);

  // create event
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [inicio, setInicio] = useState(isoNowPlus(1));
  const [fim, setFim] = useState(isoNowPlus(2));
  const [local, setLocal] = useState("");
  const [creating, setCreating] = useState(false);

  async function loadGroups() {
    setErr(null);
    setLoading(true);
    try {
      const data = await getMyGroups();
      setGroups(data);
      setSelected(data[0] || null);
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Erro ao obter grupos.");
    } finally {
      setLoading(false);
    }
  }

  async function loadGroupData(g: Group) {
    setErr(null);
    try {
      const [slotsRes, eventsRes] = await Promise.all([
        getGroupSlots(g._id),
        getGroupEvents(g._id),
      ]);
      setSlots(slotsRes.slots || []);
      setEvents(eventsRes || []);
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Erro ao obter slots/eventos.");
    }
  }

  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
    if (selected) loadGroupData(selected);
    else {
      setSlots([]);
      setEvents([]);
    }
  }, [selected?._id]);

  const isOwner = useMemo(() => {
    if (!selected || !user) return false;
    return selected.owner === user._id;
  }, [selected, user]);

  const groupsSorted = useMemo(() => [...groups].sort((a, b) => a.nome.localeCompare(b.nome)), [groups]);

  async function onAddMembers() {
    if (!selected) return;
    const emails = emailsRaw
      .split(/[,\n]/g)
      .map((s) => s.trim())
      .filter(Boolean);

    if (emails.length === 0) return;

    setAdding(true);
    setErr(null);
    try {
      await addMembersToGroup(selected._id, { emails });
      setEmailsRaw("");
      await loadGroups(); // atualiza membros no /groups/me
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Erro ao adicionar membros.");
    } finally {
      setAdding(false);
    }
  }

  async function onCreateEvent() {
    if (!selected) return;
    if (!titulo.trim()) {
      setErr("Título é obrigatório.");
      return;
    }

    setCreating(true);
    setErr(null);
    try {
      await createGroupEvent(selected._id, {
        titulo: titulo.trim(),
        descricao: descricao.trim() || undefined,
        inicio: new Date(inicio).toISOString(),
        fim: new Date(fim).toISOString(),
        local: local.trim() || undefined,
      });
      setTitulo("");
      setDescricao("");
      setLocal("");
      setInicio(isoNowPlus(1));
      setFim(isoNowPlus(2));
      await loadGroupData(selected);
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Erro ao criar evento.");
    } finally {
      setCreating(false);
    }
  }

  if (loading) return <div className="p-2">A carregar…</div>;

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xl font-semibold">Grupos</div>
        <div className="text-white/60 text-sm">Slots livres em comum + eventos de estudo</div>
      </div>

      {err && <div className="text-sm text-red-300">{err}</div>}

      <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-3">
        <Card>
          <div className="text-sm text-white/60 mb-3">Os teus grupos</div>
          <div className="space-y-2">
            {groupsSorted.map((g) => (
              <button
                key={g._id}
                onClick={() => setSelected(g)}
                className={`w-full text-left rounded-xl border px-3 py-2 transition
                  ${selected?._id === g._id ? "bg-white text-black border-white" : "border-white/10 hover:bg-white/10"}`}
              >
                <div className="font-medium">{g.nome}</div>
                <div className="text-xs opacity-70">{g.descricao || "Sem descrição"}</div>
                <div className="text-xs opacity-70 mt-1">membros: {g.membros?.length || 0}</div>
              </button>
            ))}

            {groupsSorted.length === 0 && (
              <div className="text-sm text-white/50">Não és membro de nenhum grupo ainda.</div>
            )}
          </div>
        </Card>

        <div className="space-y-3">
          {!selected ? (
            <Card>
              <div className="text-sm text-white/60">Seleciona um grupo</div>
            </Card>
          ) : (
            <>
              <Card>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold">{selected.nome}</div>
                    <div className="text-sm text-white/60">{selected.descricao || "Sem descrição"}</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Pill>{isOwner ? "Owner" : "Membro"}</Pill>
                      <Pill>membros: {selected.membros.length}</Pill>
                    </div>
                  </div>
                </div>
              </Card>

              {isOwner && (
                <Card className="space-y-2">
                  <div className="text-sm text-white/60">Adicionar membros (só o owner)</div>
                  <div>
                    <Label>Emails (separa por vírgula ou linhas)</Label>
                    <Input
                      value={emailsRaw}
                      onChange={(e) => setEmailsRaw(e.target.value)}
                      placeholder={"a@a.com, b@b.com\nc@c.com"}
                    />
                  </div>
                  <div>
                    <Button onClick={onAddMembers} disabled={adding}>
                      {adding ? "A adicionar..." : "Adicionar membros"}
                    </Button>
                  </div>
                </Card>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <Card>
                  <div className="text-sm text-white/60 mb-3">Slots livres em comum</div>
                  <div className="space-y-2">
                    {slots.map((s, idx) => (
                      <div key={idx} className="rounded-xl border border-white/10 bg-black/30 p-3 flex justify-between">
                        <div className="font-medium">{days[s.diaSemana]}</div>
                        <div className="text-white/70">{s.inicio} — {s.fim}</div>
                      </div>
                    ))}
                    {slots.length === 0 && <div className="text-sm text-white/50">Sem slots em comum (08:00-22:00).</div>}
                  </div>
                </Card>

                <Card className="space-y-3">
                  <div className="text-sm text-white/60">Criar evento</div>

                  <div>
                    <Label>Título</Label>
                    <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Sessão de estudo - Redes" />
                  </div>

                  <div>
                    <Label>Descrição</Label>
                    <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="O que vão fazer / tópicos" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div>
                      <Label>Início</Label>
                      <Input type="datetime-local" value={inicio} onChange={(e) => setInicio(e.target.value)} />
                    </div>
                    <div>
                      <Label>Fim</Label>
                      <Input type="datetime-local" value={fim} onChange={(e) => setFim(e.target.value)} />
                    </div>
                  </div>

                  <div>
                    <Label>Local</Label>
                    <Input value={local} onChange={(e) => setLocal(e.target.value)} placeholder="Sala, Discord, Biblioteca..." />
                  </div>

                  <Button onClick={onCreateEvent} disabled={creating}>
                    {creating ? "A criar..." : "Criar evento"}
                  </Button>
                </Card>
              </div>

              <Card>
                <div className="text-sm text-white/60 mb-3">Eventos do grupo</div>
                <div className="space-y-2">
                  {events.map((ev) => (
                    <div key={ev._id} className="rounded-xl border border-white/10 bg-black/30 p-3">
                      <div className="font-medium">{ev.titulo}</div>
                      <div className="text-xs text-white/60">
                        {new Date(ev.inicio).toLocaleString()} → {new Date(ev.fim).toLocaleString()}
                        {ev.local ? ` • ${ev.local}` : ""}
                      </div>
                      {ev.descricao && <div className="text-sm text-white/70 mt-2">{ev.descricao}</div>}
                    </div>
                  ))}
                  {events.length === 0 && <div className="text-sm text-white/50">Ainda não há eventos.</div>}
                </div>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
