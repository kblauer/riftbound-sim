import type { Json } from "@riftbound-sim/db";
import {
  type Action,
  applyAction,
  createMatch,
  type MatchSetup,
  type MatchState,
  type PlayerId,
  placeholderDeck,
  replay,
  viewFor,
} from "@riftbound-sim/engine";
import { decodeClientMessage, encode, type ServerMessage } from "@riftbound-sim/protocol";
import { type Connection, type ConnectionContext, Server, type WSMessage } from "partyserver";
import { serviceClient } from "./supabase.ts";

/** Set by the Worker after it verifies the caller's token. Never trusted from the client. */
export const USER_ID_HEADER = "x-riftbound-user-id";

interface ConnectionState {
  userId: PlayerId;
}

const actionKey = (index: number) => `action:${String(index).padStart(6, "0")}`;

/**
 * One instance per match. It owns both players' sockets, is the only authority on match
 * state, and handles one message at a time, so moves never race.
 *
 * The object can be evicted from memory while idle (sockets stay open via hibernation),
 * so every accepted action is written to storage and state is rebuilt from that log in
 * `onStart`. The same log serves reconnecting players.
 */
export class Match extends Server<Env> {
  static override options = { hibernate: true };

  #seats: PlayerId[] = [];
  #setup: MatchSetup | null = null;
  #actions: Action[] = [];
  #state: MatchState | null = null;

  override async onStart(): Promise<void> {
    this.#seats = (await this.ctx.storage.get<PlayerId[]>("seats")) ?? [];
    this.#setup = (await this.ctx.storage.get<MatchSetup>("setup")) ?? null;
    const log = await this.ctx.storage.list<Action>({ prefix: "action:" });
    this.#actions = [...log.values()];
    this.#state = this.#setup ? replay(this.#setup, this.#actions) : null;
  }

  override async onConnect(connection: Connection, ctx: ConnectionContext): Promise<void> {
    const userId = ctx.request.headers.get(USER_ID_HEADER);
    if (!userId) {
      connection.close(4401, "Unauthenticated");
      return;
    }
    connection.setState({ userId } satisfies ConnectionState);

    if (!this.#seats.includes(userId)) {
      if (this.#seats.length >= 2) {
        this.#send(connection, { type: "error", message: "This match is full" });
        connection.close(4403, "Match is full");
        return;
      }
      this.#seats.push(userId);
      await this.ctx.storage.put("seats", this.#seats);
    }

    const [first, second] = this.#seats;
    if (!this.#setup && first && second) {
      // Randomness enters here, outside the engine, and is stored so replays are exact.
      const seed = crypto.getRandomValues(new Uint32Array(1))[0] ?? 0;
      // TODO: use each player's chosen deck once deck building exists.
      this.#setup = {
        seed,
        players: [
          { id: first, deck: placeholderDeck() },
          { id: second, deck: placeholderDeck() },
        ],
      };
      await this.ctx.storage.put("setup", this.#setup);
      this.#state = createMatch(this.#setup);
      this.#sendViews(); // The match just started: tell both players.
      return;
    }

    // Joining or reconnecting: only this connection needs the current view.
    this.#sendView(connection, userId);
  }

  override async onMessage(connection: Connection, raw: WSMessage): Promise<void> {
    const userId = (connection.state as ConnectionState | null)?.userId;
    const message = typeof raw === "string" ? decodeClientMessage(raw) : null;
    if (!userId || !message) {
      this.#send(connection, { type: "error", message: "Unrecognised message" });
      return;
    }

    if (message.type === "ping") {
      this.#send(connection, { type: "pong", nonce: message.nonce });
      return;
    }

    if (!this.#state) {
      this.#send(connection, { type: "error", message: "The match has not started" });
      return;
    }

    // The acting player is always the authenticated user, whatever the client claimed.
    const action: Action = { ...message.action, player: userId };
    const result = applyAction(this.#state, action);
    if (!result.ok) {
      this.#send(connection, { type: "error", message: result.error });
      return;
    }

    await this.ctx.storage.put(actionKey(this.#actions.length), action);
    this.#actions.push(action);
    this.#state = result.state;
    this.#sendViews();

    if (this.#state.status === "finished") await this.#recordResult();
  }

  /** Sends each connected player their own redacted view. Nobody receives the full state. */
  #sendViews(): void {
    for (const connection of this.getConnections<ConnectionState>()) {
      const userId = connection.state?.userId;
      if (userId && this.#seats.includes(userId)) this.#sendView(connection, userId);
    }
  }

  #sendView(connection: Connection, userId: PlayerId): void {
    this.#send(
      connection,
      this.#state
        ? { type: "state", view: viewFor(this.#state, userId) }
        : { type: "waiting", players: this.#seats.length },
    );
  }

  #send(connection: Connection, message: ServerMessage): void {
    connection.send(encode(message));
  }

  /** The one Supabase write per match: the result row plus the replay log. */
  async #recordResult(): Promise<void> {
    const supabase = serviceClient(this.env);
    const [playerOne, playerTwo] = this.#seats;
    if (!supabase || !this.#setup || !this.#state || !playerOne || !playerTwo) return;
    if (await this.ctx.storage.get<boolean>("recorded")) return;

    const { error } = await supabase.from("matches").insert({
      id: this.name,
      player_one: playerOne,
      player_two: playerTwo,
      winner: this.#state.winner,
      seed: this.#setup.seed,
      turns: this.#state.turn,
    });
    if (error) {
      console.error("Failed to record match result", error.message);
      return;
    }
    const replayInsert = await supabase.from("match_replays").insert({
      match_id: this.name,
      setup: this.#setup as unknown as NonNullable<Json>,
      actions: this.#actions as NonNullable<Json>,
    });
    if (replayInsert.error) console.error("Failed to record replay", replayInsert.error.message);
    await this.ctx.storage.put("recorded", true);
  }
}
