import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { io, type Socket } from "socket.io-client";
import { getAccessToken } from "@/api/client";
import { useAuth } from "@/context/AuthContext";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";
const RETRY_DELAY_MS = 3000;

interface RealtimeValue {
  /** True while the live connection is up. Notifications poll every 30 s only while this is false. */
  connected: boolean;
}

const RealtimeContext = createContext<RealtimeValue>({ connected: false });

/** Server event payload: which notification, and when the database created it. */
interface NotificationEvent {
  id: string;
  createdAt: string;
}

/**
 * Live notifications (GP2 item 6). While someone is signed in, keeps one Socket.IO connection to
 * the API, authenticated with the same in-memory access token as REST calls. When a notification
 * event arrives, it refreshes the notification list and the signed-in user (their XP/badges).
 *
 * The server closes the connection when the access token expires (or refuses an expired one);
 * we then refresh the token through a normal API call and reconnect. After any reconnect we
 * refetch once, to catch anything that happened while the connection was down.
 */
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { authUser, reloadUser } = useAuth();
  const queryClient = useQueryClient();
  const [connected, setConnected] = useState(false);
  const reloadRef = useRef(reloadUser);
  reloadRef.current = reloadUser;

  const userId = authUser?.id;

  useEffect(() => {
    if (!userId) return;

    let disposed = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let hasConnectedBefore = false;

    const socket: Socket = io(BASE_URL, {
      // A function, so every (re)connect sends the CURRENT token, not the one from sign-in.
      auth: (cb) => cb({ token: getAccessToken() }),
      transports: ["websocket"],
      withCredentials: true,
    });

    const refresh = () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      void reloadRef.current();
    };

    /** Get a fresh access token via a normal API call, then reconnect. Stops if the session is gone. */
    const reconnectWithFreshToken = () => {
      if (disposed || retryTimer) return;
      retryTimer = setTimeout(async () => {
        retryTimer = undefined;
        if (disposed) return;
        if (await reloadRef.current()) socket.connect();
      }, RETRY_DELAY_MS);
    };

    socket.on("connect", () => {
      setConnected(true);
      if (hasConnectedBefore) refresh(); // catch up on anything missed while disconnected
      hasConnectedBefore = true;
    });

    socket.on("disconnect", (reason) => {
      setConnected(false);
      // The server closed it on purpose (token expired): socket.io won't retry by itself.
      if (reason === "io server disconnect") reconnectWithFreshToken();
    });

    socket.on("connect_error", (err) => {
      setConnected(false);
      // Refused by the server's auth check: socket.io won't retry by itself.
      if (err.message === "unauthorized") reconnectWithFreshToken();
    });

    socket.on("notification", (event: NotificationEvent) => {
      refresh();
      if (import.meta.env.DEV) {
        // Dev-only: how long the event took from database insert to this tab (same machine, same clock).
        const w = window as unknown as { __iuRealtimeLatencyMs?: number[] };
        (w.__iuRealtimeLatencyMs ??= []).push(Date.now() - new Date(event.createdAt).getTime());
      }
    });

    return () => {
      disposed = true;
      if (retryTimer) clearTimeout(retryTimer);
      socket.removeAllListeners();
      socket.disconnect();
      setConnected(false);
    };
  }, [userId, queryClient]);

  return <RealtimeContext.Provider value={{ connected }}>{children}</RealtimeContext.Provider>;
}

export function useRealtime() {
  return useContext(RealtimeContext);
}
