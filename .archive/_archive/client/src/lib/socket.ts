import { io, Socket } from "socket.io-client";

let socketInstance: Socket | null = null;

export function getSocket(): Socket {
  if (!socketInstance) {
    socketInstance = io("/", {
      path: "/socket.io",
      transports: ["websocket", "polling"],
      withCredentials: true,
      autoConnect: true,
    });
    socketInstance.on("connect", () => console.info("[socket] connected", socketInstance?.id));
    socketInstance.on("disconnect", (r) => console.info("[socket] disconnected:", r));
  }
  return socketInstance;
}

// Export default socket instance
export const socket = getSocket();