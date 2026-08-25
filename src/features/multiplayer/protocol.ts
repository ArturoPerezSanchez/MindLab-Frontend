import type { GameCustomization } from "@/features/skins/skins";

/**
 * The wire contract between the client and the room server, and the single
 * place both sides agree on. The backend mirrors these shapes in
 * `app/schemas/multiplayer.py` and produces them in
 * `app/services/multiplayer/rooms.py`; change them together.
 *
 * Design decisions this encodes, and why:
 *
 * 1. The server is authoritative. Rooms live on the server, not on the host's
 *    machine, so a host leaving is an ordinary disconnect and the game
 *    continues (requirement 13). It also means completion times are measured
 *    server-side rather than self-reported, which is what makes elimination and
 *    rating trustworthy.
 * 2. Clients never send "I finished". They send the board state they believe
 *    solves it, and the server validates and stamps the time. A client that
 *    lies is rejected rather than believed.
 * 3. Player cosmetics travel with the roster, so spectators render each board
 *    with its owner's own skin (requirement 10) without a second round trip.
 * 4. Live progress comes in two grades. Everyone gets *counts* - queens placed,
 *    how many are on the right squares - which reveal nothing about position.
 *    Actual cells arrive only for players who are out of the round, in a
 *    separate `board` message the server sends to them alone. Watching a rival
 *    should be a read on the race, not a look at their answers.
 */

/** Mirrors `MAX_PLAYERS_CEILING`. Raising it is a one-line change on each side. */
export const MAX_PLAYERS = 8;
export const MIN_PLAYERS_TO_START = 2;
export const DEFAULT_ROUND_SECONDS = 180;
export const COUNTDOWN_SECONDS = 3;
/** How long the server shows round results before starting the next round. */
export const RESULTS_PAUSE_SECONDS = 5;
/** How long the final standings stay up before the room returns to its lobby. */
export const FINISHED_LOBBY_DELAY_SECONDS = 8;

export const MIN_ROUND_SECONDS = 30;
export const MAX_ROUND_SECONDS = 600;
export const MIN_BOARD_SIZE = 4;
export const MAX_BOARD_SIZE = 10;

/**
 * Only Queens is implemented, but the setting is real and host-configurable, so
 * adding Tango or Zip is a generator and a validator rather than a protocol
 * change. A "random each round" mode is the obvious next entry.
 */
export const MULTIPLAYER_GAME_IDS = ["queens"] as const;
export type MultiplayerGameId = (typeof MULTIPLAYER_GAME_IDS)[number];

export type PlayerId = string;

export type Placement = readonly [row: number, col: number];

/**
 * What the server calls a player's state within a round.
 *
 * `finished` means "solved this round, now spectating until it ends".
 * `spectating` means "out of the game" - eliminated, timed out, or forfeited.
 * The two look alike on screen; the difference is only whether they return to
 * `playing` next round. The server has no separate "eliminated" status, so
 * neither does this type.
 */
export type PlayerStatus = "waiting" | "playing" | "finished" | "spectating";

export type RoomPlayer = {
  id: PlayerId;
  nickname: string;
  /** Null for guests, who still play and still carry a rating. */
  userId: number | null;
  isGuest: boolean;
  nationality: string | null;
  avatarUrl: string;
  portraitId: string;
  elo: number;
  /** Their chosen parts, so spectator tiles render in their skin, not yours. */
  skin: GameCustomization;
  status: PlayerStatus;
  /** Server-measured seconds for the current round, once finished. */
  finishedInSeconds: number | null;
  connected: boolean;
  /** Queens on their board this round. Safe to show anyone: it is a count. */
  placed: number;
  /** How many of those are on solution squares. Never shown to its own owner. */
  correct: number;
};

export type RoomSettings = {
  gameId: MultiplayerGameId;
  /** Server-owned. Rooms fill to the ceiling and then turn people away. */
  maxPlayers: number;
  roundSeconds: number;
  boardSize: number;
};

/** The settings a host may actually change. `maxPlayers` is not one of them. */
export type EditableSettings = Pick<RoomSettings, "gameId" | "roundSeconds" | "boardSize">;

/** Epoch milliseconds on the server's clock, not the client's. */
export type ServerTimestamp = number;

export type RoomPhase =
  | { name: "lobby" }
  /** Board is visible but input is refused until `startsAt`. */
  | { name: "countdown"; round: number; startsAt: ServerTimestamp }
  | { name: "playing"; round: number; startsAt: ServerTimestamp; endsAt: ServerTimestamp }
  /** Between rounds, showing who went out. */
  | { name: "results"; round: number; eliminated: readonly PlayerId[] }
  | { name: "finished"; winner: PlayerId | null };

export type RoomPuzzle = {
  /** Region ids per cell, exactly as the single-player Queens generator emits. */
  board: number[][];
};

export type RoomState = {
  code: string;
  /** Null only between the last player leaving and the room being cleaned up. */
  hostId: PlayerId | null;
  settings: RoomSettings;
  phase: RoomPhase;
  players: readonly RoomPlayer[];
  /** Serialised puzzle for the current round. Identical for every player. */
  puzzle: RoomPuzzle | null;
  /** Server clock at send time, so clients can correct for drift. */
  serverTime: ServerTimestamp;
};

/* ------------------------------------------------------------ client sends -- */

/**
 * Always the first message on the socket, and only ever the first: `code: null`
 * creates a room and makes the sender its host, a code joins that room. A
 * rejoin with the same identity (`token`'s user, or `guestId`) re-attaches to
 * the existing player rather than creating a second one.
 */
export type JoinMessage = {
  type: "join";
  code: string | null;
  token: string | null;
  guestId: string | null;
  nickname: string;
  skin: GameCustomization;
  avatarUrl: string;
  portraitId: string;
};

export type ClientMessage =
  | JoinMessage
  | { type: "leave" }
  /** Host only; starts even if the lobby is not full. */
  | { type: "start" }
  | { type: "updateSettings"; settings: Partial<EditableSettings> }
  | { type: "chat"; text: string }
  /**
   * A full board snapshot the player believes is a solution. The server
   * validates it; there is no "I won" message a client can simply assert.
   */
  | { type: "submit"; round: number; placements: readonly Placement[] }
  /**
   * Where the player's queens currently are. The server turns this into counts
   * for everyone and forwards the cells themselves only to players who are out
   * of the round, so a rival still racing learns pace but not position.
   */
  | { type: "progress"; round: number; placements: readonly Placement[] };

/* ------------------------------------------------------------ server sends -- */

export type EloChange = {
  playerId: PlayerId;
  before: number;
  after: number;
  /** Final standing for the game, 1 being the winner. */
  position: number;
};

export type EliminationReason = "slowest" | "timeout";

export type RejectionReason = "invalid-solution" | "wrong-round" | "not-playing";

export type RoomErrorCode =
  | "room-full"
  | "not-found"
  | "already-started"
  | "forbidden"
  | "not-enough-players";

export type ChatMessage = {
  playerId: PlayerId;
  nickname: string;
  text: string;
  /** Server clock, so ordering survives clients with skewed clocks. */
  at: ServerTimestamp;
};

export type ServerMessage =
  /** Sent once, immediately after a successful join, before the first state. */
  | { type: "joined"; playerId: PlayerId; code: string }
  | { type: "state"; state: RoomState }
  /** Incremental roster change, so a full state push is not needed per event. */
  | { type: "player"; player: RoomPlayer }
  /** Counts, sent to everyone. Reveals pace, not position. */
  | { type: "progress"; playerId: PlayerId; placed: number; correct: number; wrong: number }
  /**
   * The cells themselves. Sent only to players who are out of the round, which
   * is enforced server-side - a racing client never receives one of these.
   */
  | { type: "board"; playerId: PlayerId; placements: readonly Placement[] }
  | { type: "chat"; playerId: PlayerId; nickname: string; text: string; at: ServerTimestamp }
  | { type: "finished"; playerId: PlayerId; seconds: number; position: number }
  | { type: "eliminated"; playerIds: readonly PlayerId[]; reason: EliminationReason }
  | { type: "ratings"; changes: readonly EloChange[] }
  | { type: "rejected"; reason: RejectionReason }
  | { type: "error"; code: RoomErrorCode };

export const ROOM_ERROR_COPY: Record<RoomErrorCode, string> = {
  "room-full": "That game is full.",
  "not-found": "No game with that code.",
  "already-started": "That game has already started.",
  forbidden: "Only the host can do that.",
  "not-enough-players": `You need at least ${MIN_PLAYERS_TO_START} players to start.`,
};
