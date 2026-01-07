import { useEffect, useMemo, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { createSocket } from "../api/socket";
import type { PresenceEntry } from "../api/types";

type PresenceMap = Record<string, PresenceEntry>;

export function usePresence(token: string | null) {
  const socketRef = useRef<Socket | null>(null);
  const [presence, setPresence] = useState<PresenceMap>({});

  useEffect(() => {
    if (!token) return;

    const socket = createSocket(token);
    socketRef.current = socket;

    socket.on("presence:update", (payload: { userId: string; online: boolean; lastSeen?: string | Date }) => {
      const lastSeen =
        payload.lastSeen instanceof Date ? payload.lastSeen.toISOString() :
        typeof payload.lastSeen === "string" ? payload.lastSeen :
        undefined;

      setPresence((prev) => ({
        ...prev,
        [payload.userId]: { online: payload.online, lastSeen },
      }));
    });

    socket.on("presence:error", () => {
      // ignora ou podes mostrar toast
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  return useMemo(() => ({ presence }), [presence]);
}
