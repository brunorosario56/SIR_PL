export type User = {
  _id: string;
  nome: string;
  email: string;
};

export type ScheduleBlock = {
  disciplina: string;
  sala?: string;
  diaSemana: number; // 1..7
  horaInicio: string; // "HH:MM"
  horaFim: string; // "HH:MM"
};

export type Schedule = {
  user: string;
  blocos: ScheduleBlock[];
};

export type Group = {
  _id: string;
  nome: string;
  descricao?: string;
  owner: string;
  membros: string[];
};

export type Slot = {
  diaSemana: number;
  inicio: string; // "HH:MM"
  fim: string; // "HH:MM"
};

export type StudyEvent = {
  _id: string;
  group: string;
  criador: string;
  titulo: string;
  descricao?: string;
  inicio: string; // ISO
  fim: string; // ISO
  local?: string;
  createdAt: string;
  updatedAt: string;
};

export type PresenceEntry = {
  online: boolean;
  lastSeen?: string;
};
