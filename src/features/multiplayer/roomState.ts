import type {
  ChatMessage,
  EliminationReason,
  EloChange,
  Placement,
  PlayerId,
  RejectionReason,
  RoomPlayer,
  RoomState,
  ServerMessage,
  ServerTimestamp,
} from "./protocol";

/** Live counts for one player this round. Position-free by construction. */
export type PlayerProgress = {
  placed: number;
  correct: number;
  wrong: number;
};

/** Chat is a room fixture, not a round one, so it outlives eliminations. */
const CHAT_HISTORY_LIMIT = 120;

/**
 * Everything the client knows about the room it is in, folded from the server's
 * messages. Kept as a plain reducer with no React or socket in sight so the
 * interesting parts - which round resets what, how the clock is corrected, who
 * counts as watchable - can be tested directly.
 *
 * The server is the only writer of truth here. Nothing in this module invents
 * state; it only decides how long a server-sent fact stays on screen.
 */
export type RoomView = {
  /** Set by `joined`, which arrives before the first `state`. */
  selfId: PlayerId | null;
  code: string | null;
  state: RoomState | null;
  /**
   * Live counts per player for the current round. Everyone receives these, so
   * they are safe to render anywhere - including for players who are still
   * racing and must not see positions.
   */
  progress: Readonly<Record<PlayerId, PlayerProgress>>;
  /**
   * Actual placements per player. Only ever populated for a viewer the server
   * has decided is out of the round, because only then does it send `board`
   * messages. A racing client's copy of this stays empty on its own.
   */
  boards: Readonly<Record<PlayerId, readonly Placement[]>>;
  /** Room chat, oldest first, trimmed to the most recent messages. */
  chat: readonly ChatMessage[];
  /** Finish order and server-measured time, from `finished` broadcasts. */
  finishes: Readonly<Record<PlayerId, { seconds: number; position: number }>>;
  /** Who went out most recently, and why. Cleared when the next round begins. */
  lastElimination: { playerIds: readonly PlayerId[]; reason: EliminationReason } | null;
  /** Final rating movement, kept until the room returns to its lobby. */
  ratings: readonly EloChange[] | null;
  /**
   * Server clock minus client clock, in milliseconds. Added to `Date.now()` to
   * read the server's clock, so a client whose machine is minutes off still
   * counts down to the same instant as everyone else (requirement 9).
   */
  clockOffset: number;
  /** Last room-level error, e.g. a bad code. Sticky until the next attempt. */
  error: string | null;
  /** Last rejected submission. Cleared on the next round. */
  rejection: RejectionReason | null;
};

export const initialRoomView: RoomView = {
  selfId: null,
  code: null,
  state: null,
  progress: {},
  boards: {},
  chat: [],
  finishes: {},
  lastElimination: null,
  ratings: null,
  clockOffset: 0,
  error: null,
  rejection: null,
};

/* ------------------------------------------------------------------ parsing -- */

/**
 * Narrows an untrusted socket payload to a `ServerMessage`.
 *
 * This is a shape check, not validation: the server is trusted for content, but
 * a malformed or truncated frame should be dropped rather than crash a render.
 */
export function parseServerMessage(raw: unknown): ServerMessage | null {
  if (typeof raw !== "object" || raw === null) {
    return null;
  }
  const message = raw as { type?: unknown };
  if (typeof message.type !== "string") {
    return null;
  }
  const known = [
    "joined",
    "state",
    "player",
    "progress",
    "board",
    "chat",
    "finished",
    "eliminated",
    "ratings",
    "rejected",
    "error",
  ];
  return known.includes(message.type) ? (raw as ServerMessage) : null;
}

/* ------------------------------------------------------------------ reducer -- */

function roundOf(state: RoomState | null): number | null {
  const phase = state?.phase;
  if (!phase) {
    return null;
  }
  return phase.name === "countdown" || phase.name === "playing" || phase.name === "results"
    ? phase.round
    : null;
}

/**
 * A round boundary clears per-round scratch state. Detected from the round
 * number rather than the phase name because `state` can be re-sent within a
 * phase (a player joining, a roster change) and must not wipe live progress.
 */
function isNewRound(previous: RoomState | null, next: RoomState): boolean {
  if (next.phase.name === "lobby") {
    return previous?.phase.name !== "lobby";
  }
  if (next.phase.name === "countdown") {
    return roundOf(previous) !== next.phase.round;
  }
  return false;
}

export function roomReducer(view: RoomView, message: ServerMessage): RoomView {
  switch (message.type) {
    case "joined":
      return { ...view, selfId: message.playerId, code: message.code, error: null };

    case "state": {
      const boundary = isNewRound(view.state, message.state);
      return {
        ...view,
        state: message.state,
        code: message.state.code,
        // One-way latency is folded into the offset, which is the same for
        // everyone and small next to a 3s countdown, so it is not corrected for.
        clockOffset: message.state.serverTime - Date.now(),
        progress: boundary ? {} : view.progress,
        boards: boundary ? {} : view.boards,
        finishes: boundary ? {} : view.finishes,
        lastElimination: boundary ? null : view.lastElimination,
        rejection: boundary ? null : view.rejection,
        // Ratings arrive during `finished` and stay visible until the room
        // drops back to its lobby for the next game (requirement 12).
        ratings: message.state.phase.name === "lobby" ? null : view.ratings,
      };
    }

    case "player": {
      if (!view.state) {
        return view;
      }
      const players = view.state.players.map((player) =>
        player.id === message.player.id ? message.player : player,
      );
      const isKnown = players.some((player) => player.id === message.player.id);
      return {
        ...view,
        state: { ...view.state, players: isKnown ? players : [...players, message.player] },
      };
    }

    case "progress":
      return {
        ...view,
        progress: {
          ...view.progress,
          [message.playerId]: {
            placed: message.placed,
            correct: message.correct,
            wrong: message.wrong,
          },
        },
      };

    case "board":
      return { ...view, boards: { ...view.boards, [message.playerId]: message.placements } };

    case "chat":
      return {
        ...view,
        chat: [
          ...view.chat.slice(-(CHAT_HISTORY_LIMIT - 1)),
          {
            playerId: message.playerId,
            nickname: message.nickname,
            text: message.text,
            at: message.at,
          },
        ],
      };

    case "finished":
      return {
        ...view,
        finishes: {
          ...view.finishes,
          [message.playerId]: { seconds: message.seconds, position: message.position },
        },
      };

    case "eliminated":
      return {
        ...view,
        lastElimination: { playerIds: message.playerIds, reason: message.reason },
      };

    case "ratings":
      return { ...view, ratings: message.changes };

    case "rejected":
      return { ...view, rejection: message.reason };

    case "error":
      return { ...view, error: message.code };

    default:
      return view;
  }
}

/* ------------------------------------------------------------------ selectors */

/** The server's clock, as best this client can tell. */
export function serverNow(view: RoomView): ServerTimestamp {
  return Date.now() + view.clockOffset;
}

/**
 * Whole seconds left until a server timestamp, floored at zero.
 *
 * Rounded up so a countdown reads "3" for the whole first second rather than
 * flicking to "2" immediately, which is what makes three clients started
 * milliseconds apart show the same number.
 */
export function secondsUntil(target: ServerTimestamp, view: RoomView): number {
  return Math.max(0, Math.ceil((target - serverNow(view)) / 1000));
}

export function selfPlayer(view: RoomView): RoomPlayer | null {
  if (!view.state || !view.selfId) {
    return null;
  }
  return view.state.players.find((player) => player.id === view.selfId) ?? null;
}

export function isHost(view: RoomView): boolean {
  return Boolean(view.selfId && view.state?.hostId === view.selfId);
}

/** Out of the game entirely, as opposed to done with the current round. */
export function isEliminated(player: RoomPlayer): boolean {
  return player.status === "spectating";
}

/**
 * True once the round is over for you - you solved it, or you are out of the
 * game. This is exactly the condition under which the server starts sending you
 * `board` messages, so it is also the condition under which the UI may show
 * other people's boards.
 */
export function isSpectator(view: RoomView): boolean {
  const self = selfPlayer(view);
  return self?.status === "finished" || self?.status === "spectating";
}

/** True while the board must be visible but refuse input (requirement 9). */
export function isInputLocked(view: RoomView): boolean {
  const phase = view.state?.phase;
  if (!phase || phase.name !== "playing") {
    return true;
  }
  const self = selfPlayer(view);
  return self?.status !== "playing";
}

/**
 * Boards a spectator can switch between: everyone taking part in this round, in
 * roster order, minus the viewer's own (requirement 6). Only reachable once
 * `isSpectator` holds, which is also when the boards themselves start arriving.
 */
export function spectatableIds(view: RoomView): readonly PlayerId[] {
  if (!view.state) {
    return [];
  }
  return view.state.players
    .filter(
      (player) =>
        player.id !== view.selfId &&
        (player.status === "playing" || player.status === "finished" || player.status === "waiting"),
    )
    .map((player) => player.id);
}

/**
 * Moves a spectator's selection by `step`, wrapping, and re-anchors if the
 * player being watched has dropped out of the list since the last render.
 */
export function stepSpectatorTarget(
  ids: readonly PlayerId[],
  current: PlayerId | null,
  step: number,
): PlayerId | null {
  if (ids.length === 0) {
    return null;
  }
  const index = current === null ? -1 : ids.indexOf(current);
  if (index === -1) {
    return ids[0];
  }
  return ids[(index + step + ids.length) % ids.length];
}

/** Standings for the results and end-of-game panels: survivors first. */
export function orderedStandings(view: RoomView): readonly RoomPlayer[] {
  if (!view.state) {
    return [];
  }
  const rank = (player: RoomPlayer): number => {
    if (view.state?.phase.name === "finished" && view.state.phase.winner === player.id) {
      return 0;
    }
    if (player.status === "finished") {
      return 1;
    }
    if (player.status === "playing" || player.status === "waiting") {
      return 2;
    }
    return 3;
  };
  return [...view.state.players].sort((left, right) => {
    const byRank = rank(left) - rank(right);
    if (byRank !== 0) {
      return byRank;
    }
    return (left.finishedInSeconds ?? Infinity) - (right.finishedInSeconds ?? Infinity);
  });
}
