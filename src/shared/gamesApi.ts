/**
 * Calls for puzzles the server plays with you rather than just handing over.
 *
 * Generated puzzles no longer arrive with their answer attached: the server
 * keeps it so a recorded result can be checked against something real. Anything
 * a game needs to know mid-play - what is under this cell, what does the
 * opponent reply, what was the answer - is asked for here.
 */

import { apiPath } from "@/shared/api";

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(apiPath(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(payload?.detail ?? `Request failed with status ${response.status}.`);
  }
  return (await response.json()) as T;
}

/**
 * Asks for the answer, and accepts the consequence.
 *
 * The server records that this puzzle was assisted, so the result reported
 * afterwards cannot claim an unaided win. That is the trade: looking is
 * allowed, pretending you did not look is not.
 */
export async function revealSolution<T>(puzzleHandle: string): Promise<T> {
  const payload = await postJson<{ solution: T }>("/games/reveal", {
    puzzle_handle: puzzleHandle,
  });
  return payload.solution;
}

export type RevealedCell = {
  row: number;
  col: number;
  /** -1 for a mine, otherwise how many mines touch the cell. */
  value: number;
};

export type MineIslandsReveal = {
  cells: RevealedCell[];
  hit_mine: boolean;
  solved: boolean;
  revealed_count: number;
  safe_cell_count: number;
};

/** Uncovers one Mine Islands cell. The layout only ever exists on the server. */
export function revealMineIslandsCell(
  puzzleHandle: string,
  row: number,
  col: number,
): Promise<MineIslandsReveal> {
  return postJson<MineIslandsReveal>("/games/mine-islands/reveal", {
    puzzle_handle: puzzleHandle,
    row,
    col,
  });
}

export type ChessMoveInput = {
  from: string;
  to: string;
  promotion?: string | null;
};

export type MiniChessMoveResult = {
  accepted: boolean;
  reply: (ChessMoveInput & { san?: string | null }) | null;
  states: unknown[];
  solved: boolean;
  moves_played: number;
};

/**
 * Plays one move of the mating line.
 *
 * A wrong move comes back with `accepted: false` and nothing else - no
 * position, no reply - so the line cannot be recovered by guessing and reading
 * what comes back.
 */
export function playMiniChessMove(
  puzzleHandle: string,
  move: ChessMoveInput,
): Promise<MiniChessMoveResult> {
  return postJson<MiniChessMoveResult>("/games/mini-chess/move", {
    puzzle_handle: puzzleHandle,
    move,
  });
}
