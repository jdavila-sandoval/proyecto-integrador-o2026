import { io, type Socket } from "socket.io-client";
import type { RealtimeStatus } from "../types";

type RealtimeListener = (payload: Record<string, unknown>) => void;

const REALTIME_URL = import.meta.env.VITE_REALTIME_URL || "http://localhost:3001";
const listeners = new Map<string, Set<RealtimeListener>>();
let socket: Socket | null = null;
let status: RealtimeStatus = "desconectado";
const statusListeners = new Set<(status: RealtimeStatus) => void>();

function setStatus(nextStatus: RealtimeStatus) {
  status = nextStatus;
  statusListeners.forEach((listener) => listener(nextStatus));
}

function handleEvent(eventName: string, payload: Record<string, unknown>) {
  listeners.get(eventName)?.forEach((listener) => listener(payload));
}

export const realtimeService = {
  connect(token: string) {
    if (socket?.connected) return;
    socket?.disconnect();
    socket = io(REALTIME_URL, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 500,
      reconnectionDelayMax: 3000,
    });
    setStatus("reconectando");
    socket.on("connect", () => setStatus("conectado"));
    socket.on("disconnect", () => setStatus("desconectado"));
    socket.on("connect_error", () => setStatus("reconectando"));
    socket.on("reconnect_attempt", () => setStatus("reconectando"));
    socket.on("catalog:changed", (payload) => handleEvent("catalog:changed", payload));
    socket.on("file:changed", (payload) => handleEvent("file:changed", payload));
    socket.on("sync:required", (payload) => handleEvent("sync:required", payload));
  },
  disconnect() {
    socket?.disconnect();
    socket = null;
    setStatus("desconectado");
  },
  subscribe(eventName: string, listener: RealtimeListener) {
    if (!listeners.has(eventName)) listeners.set(eventName, new Set());
    listeners.get(eventName)?.add(listener);
    return () => {
      listeners.get(eventName)?.delete(listener);
    };
  },
  getStatus: () => status,
  subscribeStatus(listener: (status: RealtimeStatus) => void) {
    statusListeners.add(listener);
    listener(status);
    return () => {
      statusListeners.delete(listener);
    };
  },
};
