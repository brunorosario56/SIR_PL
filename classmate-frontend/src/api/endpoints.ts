import { api } from "./client";
import type { Group, Schedule, StudyEvent, User } from "./types";

export async function authLogin(email: string, password: string) {
  const { data } = await api.post<{ token: string }>("/auth/login", { email, password });
  return data;
}

export async function authRegister(nome: string, email: string, password: string) {
  const { data } = await api.post("/auth/register", { nome, email, password });
  return data;
}

export async function authMe() {
  const { data } = await api.get<User>("/auth/me");
  return data;
}

export async function getMySchedule() {
  const { data } = await api.get<Schedule>("/schedules/me");
  return data;
}

export async function putMySchedule(blocos: Schedule["blocos"]) {
  const { data } = await api.put("/schedules/me", { blocos });
  return data;
}

export async function getMyColegas() {
  const { data } = await api.get<{ colegas: User[] }>("/users/me/colegas");
  return data;
}

export async function addColega(email: string) {
  const { data } = await api.post("/users/me/colegas", { email });
  return data;
}

export async function getMyGroups() {
  const { data } = await api.get<Group[]>("/groups/me");
  return data;
}

export async function addMembersToGroup(groupId: string, payload: { emails?: string[]; userIds?: string[] }) {
  const { data } = await api.post(`/groups/${groupId}/members`, payload);
  return data;
}

export async function getGroupSlots(groupId: string) {
  const { data } = await api.get<{ groupId: string; slots: any[] }>(`/groups/${groupId}/slots`);
  return data;
}

export async function createGroupEvent(groupId: string, body: {
  titulo: string;
  descricao?: string;
  inicio: string; // ISO
  fim: string; // ISO
  local?: string;
}) {
  const { data } = await api.post(`/groups/${groupId}/events`, body);
  return data;
}

export async function getGroupEvents(groupId: string) {
  const { data } = await api.get<StudyEvent[]>(`/groups/${groupId}/events`);
  return data;
}
