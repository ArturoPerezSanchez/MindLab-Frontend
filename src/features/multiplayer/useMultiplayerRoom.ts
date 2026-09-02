import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { apiPath } from "@/shared/api";
import type { GameCustomization } from "@/features/skins/skins";
import { guestId } from "./guest";
import type { ClientMessage, EditableSettings, Placement } from "./protocol";
import { initialRoomView, parseServerMessage, roomReducer, type RoomView } from "./roomState";

export type ConnectionStatus = "idle" | "connecting" | "reconnecting" | "open" | "closed";

export type JoinIdentity = {
  token: string | null;
  nickname: string;
  skin: GameCustomization;
  avatarUrl: string;
  portraitId: string;
};

/** Live placements are rebroadcast to spectators; this caps the send rate. */
const PROGRESS_INTERVAL_MS = 250;
const MAX_RECONNECT_ATTEMPTS = 5;

function socketUrl(): string {
  const url = new URL(apiPath("/multiplayer/ws"), window.location.href);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.toString();
}

/**
 * One socket, one room. The hook owns the connection and folds every server
 * message into `view` through the pure reducer in `roomState.ts`; it holds no
 * game state of its own beyond the socket itself.
 *
 * Joining is explicit rather than an effect on mount, because `code: null`
 * *creates* a room - a component that connected automatically would spawn rooms
 * on every render pass in development.
 */
export function useMultiplayerRoom(identity: JoinIdentity) {
  const [view, dispatch] = useReducer(roomReducer, initialRoomView);
  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const socketRef = useRef<WebSocket | null>(null);
  const identityRef = useRef(identity);
  const reconnectCodeRef = useRef<string | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimer = useRef<number | null>(null);
  const intentionalClose = useRef(false);
  const openSocketRef = useRef<(code: string | null, reconnecting: boolean) => void>(() => undefined);
  const lastProgressAt = useRef(0);
  const pendingProgress = useRef<number | null>(null);

  identityRef.current = identity;

  useEffect(() => {
    if (view.state?.code) {
      reconnectCodeRef.current = view.state.code;
    }
  }, [view.state?.code]);

  const send = useCallback((message: ClientMessage) => {
    const socket = socketRef.current;
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  }, []);

  const disconnect = useCallback(() => {
    intentionalClose.current = true;
    reconnectCodeRef.current = null;
    reconnectAttempts.current = 0;
    if (reconnectTimer.current !== null) {
      window.clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
    const socket = socketRef.current;
    socketRef.current = null;
    if (socket && socket.readyState === WebSocket.OPEN) {
      // Tell the room first: an explicit leave is handled differently from a
      // dropped connection while a round is running.
      socket.send(JSON.stringify({ type: "leave" } satisfies ClientMessage));
    }
    socket?.close();
    setStatus("idle");
  }, []);

  openSocketRef.current = (code: string | null, reconnecting: boolean) => {
    socketRef.current?.close();
    intentionalClose.current = false;
    setStatus(reconnecting ? "reconnecting" : "connecting");

    const socket = new WebSocket(socketUrl());
    socketRef.current = socket;

    socket.onopen = () => {
      const current = identityRef.current;
      socket.send(
        JSON.stringify({
          type: "join",
          code: code ? code.trim().toUpperCase() : null,
          token: current.token,
          guestId: current.token ? null : guestId(),
          nickname: current.nickname,
          skin: current.skin,
          avatarUrl: current.avatarUrl,
          portraitId: current.portraitId,
        } satisfies ClientMessage),
      );
    };

    socket.onmessage = (event) => {
      let payload: unknown;
      try {
        payload = JSON.parse(String(event.data));
      } catch {
        return;
      }
      const message = parseServerMessage(payload);
      if (message) {
        if (message.type === "joined") {
          reconnectAttempts.current = 0;
          setStatus("open");
        }
        dispatch(message);
      }
    };

    socket.onclose = () => {
      if (socketRef.current === socket) {
        socketRef.current = null;
        const reconnectCode = reconnectCodeRef.current;
        if (!intentionalClose.current && reconnectCode && reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts.current += 1;
          setStatus("reconnecting");
          const delay = Math.min(1_000 * 2 ** (reconnectAttempts.current - 1), 8_000);
          reconnectTimer.current = window.setTimeout(() => {
            reconnectTimer.current = null;
            openSocketRef.current(reconnectCode, true);
          }, delay);
        } else {
          setStatus("closed");
        }
      }
    };

    socket.onerror = () => {
      // `onclose` always follows, and carries the state change. Swallowing here
      // keeps a failed connect from also logging an unhandled error event.
    };
  };

  const connect = useCallback((code: string | null) => {
    if (reconnectTimer.current !== null) {
      window.clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
    reconnectAttempts.current = 0;
    intentionalClose.current = false;
    const normalizedCode = code ? code.trim().toUpperCase() : null;
    reconnectCodeRef.current = normalizedCode;
    openSocketRef.current(normalizedCode, false);
  }, []);

  useEffect(() => {
    return () => {
      intentionalClose.current = true;
      if (reconnectTimer.current !== null) {
        window.clearTimeout(reconnectTimer.current);
      }
      if (pendingProgress.current !== null) {
        window.clearTimeout(pendingProgress.current);
      }
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, []);

  const actions = useMemo(
    () => ({
      start: () => send({ type: "start" }),
      updateSettings: (settings: Partial<EditableSettings>) =>
        send({ type: "updateSettings", settings }),
      sendChat: (text: string) => {
        const trimmed = text.trim();
        if (trimmed) {
          send({ type: "chat", text: trimmed });
        }
      },
      /**
       * Rate-limited so a fast solver dragging queens around does not flood
       * seven other sockets. The trailing send matters: without it the final
       * board before a submit could be the one that got dropped, and spectator
       * tiles would freeze a move short.
       */
      reportProgress: (round: number, placements: readonly Placement[]) => {
        const elapsed = Date.now() - lastProgressAt.current;
        if (pendingProgress.current !== null) {
          window.clearTimeout(pendingProgress.current);
          pendingProgress.current = null;
        }
        if (elapsed >= PROGRESS_INTERVAL_MS) {
          lastProgressAt.current = Date.now();
          send({ type: "progress", round, placements });
          return;
        }
        pendingProgress.current = window.setTimeout(() => {
          pendingProgress.current = null;
          lastProgressAt.current = Date.now();
          send({ type: "progress", round, placements });
        }, PROGRESS_INTERVAL_MS - elapsed);
      },
      submit: (round: number, placements: readonly Placement[]) => {
        // Flush the winning board to spectators before claiming it, so the tile
        // they are watching shows the solve rather than the move before it.
        send({ type: "progress", round, placements });
        send({ type: "submit", round, placements });
      },
    }),
    [send],
  );

  return { view: view as RoomView, status, connect, disconnect, ...actions };
}
