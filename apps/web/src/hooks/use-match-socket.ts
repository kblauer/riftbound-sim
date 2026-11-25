import type { Action, PlayerView } from "@riftbound-sim/engine";
import {
  type ClientMessage,
  decodeServerMessage,
  encode,
  MATCH_PARTY,
} from "@riftbound-sim/protocol";
import PartySocket from "partysocket";
import { useCallback, useEffect, useRef, useState } from "react";
import { getSession } from "@/lib/auth";
import { SERVER_URL } from "@/lib/supabase";

export type ConnectionStatus = "connecting" | "open" | "closed";

interface MatchSocketState {
  status: ConnectionStatus;
  /** Null until both players have joined. */
  view: PlayerView | null;
  playersJoined: number;
  error: string | null;
}

/**
 * Connects to a match's Durable Object. The server is the authority: this hook only
 * sends intents and renders whatever view the server sends back. PartySocket reconnects
 * on its own, and the server resends the current view on every (re)connect.
 */
export function useMatchSocket(matchId: string) {
  const [state, setState] = useState<MatchSocketState>({
    status: "connecting",
    view: null,
    playersJoined: 0,
    error: null,
  });
  const socketRef = useRef<PartySocket | null>(null);

  useEffect(() => {
    if (!SERVER_URL) {
      setState((s) => ({ ...s, status: "closed", error: "No match server is configured" }));
      return;
    }
    const server = new URL(SERVER_URL);
    const socket = new PartySocket({
      host: server.host,
      protocol: server.protocol === "https:" ? "wss" : "ws",
      party: MATCH_PARTY,
      room: matchId,
      // Called on every (re)connect, so an expired token is replaced by the refreshed one.
      query: async () => ({ token: (await getSession())?.access_token ?? "" }),
    });
    socketRef.current = socket;

    socket.addEventListener("open", () => setState((s) => ({ ...s, status: "open", error: null })));
    socket.addEventListener("close", () => setState((s) => ({ ...s, status: "closed" })));
    socket.addEventListener("message", (event) => {
      const message = typeof event.data === "string" ? decodeServerMessage(event.data) : null;
      if (!message) return;
      switch (message.type) {
        case "state":
          setState((s) => ({ ...s, view: message.view, error: null }));
          break;
        case "waiting":
          setState((s) => ({ ...s, playersJoined: message.players }));
          break;
        case "error":
          setState((s) => ({ ...s, error: message.message }));
          break;
        case "pong":
          break;
      }
    });

    return () => {
      socketRef.current = null;
      socket.close();
    };
  }, [matchId]);

  const send = useCallback((message: ClientMessage) => {
    socketRef.current?.send(encode(message));
  }, []);
  const act = useCallback((action: Action) => send({ type: "action", action }), [send]);

  return { ...state, act };
}
