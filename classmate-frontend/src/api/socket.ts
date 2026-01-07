import { io, Socket } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:3000";

export function createSocket(token: string): Socket {
  const socket = io(SOCKET_URL, { transports: ["websocket"] });

  socket.on("connect", () => {
    socket.emit("auth", `Bearer ${token}`);
  });

  return socket;
}
