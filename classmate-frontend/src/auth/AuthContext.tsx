import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { setAuthToken } from "../api/client";
import { authLogin, authMe, authRegister } from "../api/endpoints";
import type { User } from "../api/types";

type AuthCtx = {
  token: string | null;
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (nome: string, email: string, password: string) => Promise<void>;
  logout: () => void;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem("token"));
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadMe(tk: string) {
    try {
      setAuthToken(tk);
      const me = await authMe();
      setUser(me);
    } catch {
      logout();
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token) loadMe(token);
    else setLoading(false);
  }, []);

  async function login(email: string, password: string) {
    const { token: tk } = await authLogin(email, password);
    localStorage.setItem("token", tk);
    setToken(tk);
    await loadMe(tk);
  }

  async function register(nome: string, email: string, password: string) {
    await authRegister(nome, email, password);
    await login(email, password);
  }

  function logout() {
    localStorage.removeItem("token");
    setAuthToken();
    setToken(null);
    setUser(null);
  }

  const value = useMemo(() => ({ token, user, loading, login, register, logout }), [token, user, loading]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth tem de estar dentro do AuthProvider");
  return ctx;
}
