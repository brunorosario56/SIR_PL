import { api } from "./client";

export type User = {
  id?: string;
  _id?: string;
  email?: string;
  username?: string;
  name?: string;
};

export async function login(payload: { email: string; password: string }) {
  const { data } = await api.post("/auth/login", payload);
  return data as { token: string; user?: User };
}

export async function register(payload: {
  email: string;
  password: string;
  username?: string;
  name?: string;
}) {
  const { data } = await api.post("/auth/register", payload);
  return data as { token?: string; user?: User };
}

export async function me() {
  const { data } = await api.get("/auth/me");
  return data as User;
}

