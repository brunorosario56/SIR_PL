import { useEffect, useMemo } from "react";
import { io, Socket } from "socket.io-client";
import { getToken } from "../api/client";

export function useSocket(enabled: boolean) {
  const socket: Socket | null = useMemo(() => {
    if (!enabled) return null;

    const url = import.meta.env.VITE_SOCKET_URL;
    const token = getToken();

    return io(url, {
      transports: ["websocket"],
      auth: token ? { token } : undefined,
    });
  }, [enabled]);

  useEffect(() => {
    if (!socket) return;
    return () => socket.disconnect();
  }, [socket]);

  return socket;
}

