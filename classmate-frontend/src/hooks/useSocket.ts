import { useEffect, useMemo } from "react";
import { io, Socket } from "socket.io-client";

export function useSocket(enabled: boolean, token?: string | null) {
  const socket: Socket | null = useMemo(() => {
    if (!enabled) return null;

    const url = import.meta.env.VITE_SOCKET_URL;

    return io(url, {
      transports: ["websocket"],
      auth: token ? { token } : undefined,
    });
  }, [enabled, token]);

  useEffect(() => {
    if (!socket) return;
    return () => {
      socket.disconnect();
    };
  }, [socket]);

  return socket;
}
