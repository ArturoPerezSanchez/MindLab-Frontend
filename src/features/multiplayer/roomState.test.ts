import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  initialRoomView,
  isEliminated,
  isInputLocked,
  orderedStandings,
  parseServerMessage,
  roomReducer,
  secondsUntil,
  selfPlayer,
  spectatableIds,
  stepSpectatorTarget,
  type RoomView,
} from "./roomState";
import type { PlayerStatus, RoomPhase, RoomPlayer, RoomState } from "./protocol";

function player(id: string, status: PlayerStatus, overrides: Partial<RoomPlayer> = {}): RoomPlayer {
  return {
    id,
    nickname: id,
    userId: null,
    isGuest: true,
    nationality: null,
    avatarUrl: "",
    portraitId: "none",
    elo: 1000,
    skin: {},
    status,
    finishedInSeconds: null,
    connected: true,
    placed: 0,
    correct: 0,
    ...overrides,
  };
}

function state(phase: RoomPhase, players: RoomPlayer[], serverTime = 1_000_000): RoomState {
  return {
    code: "ABC123",
    hostId: players[0]?.id ?? null,
    settings: { gameId: "queens", maxPlayers: 8, roundSeconds: 180, boardSize: 8 },
    phase,
    players,
    puzzle: { board: [[0]] },
    serverTime,
  };
}

function viewWith(overrides: Partial<RoomView> = {}): RoomView {
  return { ...initialRoomView, ...overrides };
}

describe("parseServerMessage", () => {
  it("keeps known messages and drops anything else", () => {
    expect(parseServerMessage({ type: "state", state: null })).not.toBeNull();
    expect(parseServerMessage({ type: "definitely-not-a-message" })).toBeNull();
    expect(parseServerMessage(null)).toBeNull();
    expect(parseServerMessage("state")).toBeNull();
  });
});

describe("roomReducer", () => {
  it("takes its identity from the joined message that precedes the first state", () => {
    const next = roomReducer(initialRoomView, { type: "joined", playerId: "me", code: "ABC123" });
    expect(next.selfId).toBe("me");
    expect(next.code).toBe("ABC123");
  });

  it("clears live progress when a new round's countdown arrives", () => {
    const view = viewWith({
      state: state({ name: "results", round: 1, eliminated: ["b"] }, [player("a", "playing")]),
      progress: { a: { placed: 3, correct: 2, wrong: 1 } },
      boards: { a: [[0, 0]] },
      finishes: { a: { seconds: 12, position: 1 } },
      lastElimination: { playerIds: ["b"], reason: "slowest" },
    });

    const next = roomReducer(view, {
      type: "state",
      state: state({ name: "countdown", round: 2, startsAt: 1_003_000 }, [player("a", "waiting")]),
    });

    expect(next.progress).toEqual({});
    expect(next.boards).toEqual({});
    expect(next.finishes).toEqual({});
    expect(next.lastElimination).toBeNull();
  });

  it("keeps chat across round boundaries", () => {
    // Eliminations reset the round, not the conversation.
    const view = viewWith({
      state: state({ name: "results", round: 1, eliminated: ["b"] }, [player("a", "playing")]),
      chat: [{ playerId: "b", nickname: "b", text: "gg", at: 1 }],
    });

    const next = roomReducer(view, {
      type: "state",
      state: state({ name: "countdown", round: 2, startsAt: 1_003_000 }, [player("a", "waiting")]),
    });

    expect(next.chat).toHaveLength(1);
  });

  it("keeps live progress when the same round's state is re-sent", () => {
    // A roster change mid-round re-broadcasts state. Treating that as a round
    // boundary would blank every spectator tile for no reason.
    const view = viewWith({
      state: state({ name: "playing", round: 2, startsAt: 1000, endsAt: 9000 }, [
        player("a", "playing"),
      ]),
      progress: { a: { placed: 1, correct: 1, wrong: 0 } },
    });

    const next = roomReducer(view, {
      type: "state",
      state: state({ name: "playing", round: 2, startsAt: 1000, endsAt: 9000 }, [
        player("a", "playing"),
        player("b", "playing"),
      ]),
    });

    expect(next.progress).toEqual({ a: { placed: 1, correct: 1, wrong: 0 } });
  });

  it("drops rating changes once the room returns to its lobby", () => {
    const view = viewWith({
      state: state({ name: "finished", winner: "a" }, [player("a", "playing")]),
      ratings: [{ playerId: "a", before: 1000, after: 1024, position: 1 }],
    });

    const stillFinished = roomReducer(view, {
      type: "state",
      state: state({ name: "finished", winner: "a" }, [player("a", "playing")]),
    });
    expect(stillFinished.ratings).not.toBeNull();

    const backToLobby = roomReducer(stillFinished, {
      type: "state",
      state: state({ name: "lobby" }, [player("a", "waiting")]),
    });
    expect(backToLobby.ratings).toBeNull();
  });

  it("records progress, finishes, eliminations, and rejections", () => {
    let view = viewWith({
      state: state({ name: "playing", round: 1, startsAt: 0, endsAt: 9000 }, [
        player("a", "playing"),
      ]),
    });
    view = roomReducer(view, { type: "progress", playerId: "a", placed: 3, correct: 2, wrong: 1 });
    view = roomReducer(view, { type: "finished", playerId: "a", seconds: 31.5, position: 1 });
    view = roomReducer(view, { type: "eliminated", playerIds: ["b"], reason: "timeout" });
    view = roomReducer(view, { type: "rejected", reason: "invalid-solution" });

    expect(view.progress.a).toEqual({ placed: 3, correct: 2, wrong: 1 });
    expect(view.finishes.a).toEqual({ seconds: 31.5, position: 1 });
    expect(view.lastElimination).toEqual({ playerIds: ["b"], reason: "timeout" });
    expect(view.rejection).toBe("invalid-solution");
  });

  it("keeps counts and cells in separate buckets", () => {
    // The point of the split: a client that is still racing only ever receives
    // "progress", so `boards` stays empty for it and no view can leak a
    // position it was never sent.
    let view = viewWith({
      state: state({ name: "playing", round: 1, startsAt: 0, endsAt: 9000 }, [
        player("a", "playing"),
      ]),
    });
    view = roomReducer(view, { type: "progress", playerId: "a", placed: 2, correct: 1, wrong: 1 });
    expect(view.boards).toEqual({});

    view = roomReducer(view, {
      type: "board",
      playerId: "a",
      placements: [
        [0, 1],
        [2, 3],
      ],
    });
    expect(view.boards.a).toHaveLength(2);
    expect(view.progress.a).toEqual({ placed: 2, correct: 1, wrong: 1 });
  });

  it("appends chat in arrival order", () => {
    let view = viewWith();
    view = roomReducer(view, { type: "chat", playerId: "a", nickname: "A", text: "hi", at: 1 });
    view = roomReducer(view, { type: "chat", playerId: "b", nickname: "B", text: "hey", at: 2 });
    expect(view.chat.map((message) => message.text)).toEqual(["hi", "hey"]);
  });

  it("replaces a player in place on an incremental roster update", () => {
    const view = viewWith({
      state: state({ name: "playing", round: 1, startsAt: 0, endsAt: 9000 }, [
        player("a", "playing"),
        player("b", "playing"),
      ]),
    });

    const next = roomReducer(view, {
      type: "player",
      player: player("b", "finished", { finishedInSeconds: 22.5 }),
    });

    expect(next.state?.players).toHaveLength(2);
    expect(next.state?.players[1].status).toBe("finished");
  });
});

describe("clock correction", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(500_000));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("counts down against the server's clock, not the client's", () => {
    // This client's clock is 500 seconds behind the server's. Without the
    // offset it would show a countdown 500 seconds long.
    const view = roomReducer(initialRoomView, {
      type: "state",
      state: state({ name: "countdown", round: 1, startsAt: 1_003_000 }, [player("a", "waiting")]),
    });

    expect(view.clockOffset).toBe(500_000);
    expect(secondsUntil(1_003_000, view)).toBe(3);
    expect(secondsUntil(1_000_000, view)).toBe(0);
    expect(secondsUntil(999_000, view)).toBe(0);
  });
});

describe("selectors", () => {
  const players = [
    player("me", "playing"),
    player("mate", "playing"),
    player("done", "finished", { finishedInSeconds: 18 }),
    player("out", "spectating"),
  ];

  const view = viewWith({
    selfId: "me",
    state: state({ name: "playing", round: 3, startsAt: 0, endsAt: 9000 }, players),
  });

  it("treats spectating as out of the game and finished as out of the round", () => {
    expect(isEliminated(players[3])).toBe(true);
    expect(isEliminated(players[2])).toBe(false);
  });

  it("offers everyone still in the round except yourself to spectate", () => {
    expect(spectatableIds(view)).toEqual(["mate", "done"]);
  });

  it("wraps when stepping through spectator targets", () => {
    const ids = ["mate", "done"];
    expect(stepSpectatorTarget(ids, "mate", 1)).toBe("done");
    expect(stepSpectatorTarget(ids, "done", 1)).toBe("mate");
    expect(stepSpectatorTarget(ids, "mate", -1)).toBe("done");
    expect(stepSpectatorTarget([], "mate", 1)).toBeNull();
  });

  it("re-anchors when the watched player is no longer watchable", () => {
    expect(stepSpectatorTarget(["mate"], "gone", 1)).toBe("mate");
  });

  it("locks input outside a running round and after your own solve", () => {
    expect(isInputLocked(view)).toBe(false);
    expect(
      isInputLocked(
        viewWith({
          selfId: "me",
          state: state({ name: "countdown", round: 3, startsAt: 9000 }, players),
        }),
      ),
    ).toBe(true);
    expect(isInputLocked(viewWith({ selfId: "done", state: view.state }))).toBe(true);
  });

  it("finds the player behind the joined id", () => {
    expect(selfPlayer(view)?.id).toBe("me");
    expect(selfPlayer(viewWith({ selfId: "ghost", state: view.state }))).toBeNull();
  });

  it("ranks standings with the winner first and the eliminated last", () => {
    const finished = viewWith({
      selfId: "me",
      state: state({ name: "finished", winner: "mate" }, players),
    });
    expect(orderedStandings(finished).map((entry) => entry.id)).toEqual([
      "mate",
      "done",
      "me",
      "out",
    ]);
  });
});
