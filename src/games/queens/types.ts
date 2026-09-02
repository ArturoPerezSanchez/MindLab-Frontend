export type Position = readonly [row: number, col: number];

export type QueensResponse = {
  board: number[][];
};

/** The answer is not here: it stays on the server until the player asks. */
export type Puzzle = {
  board: number[][];
  size: number;
};

export type ViolationKind = "row" | "column" | "region" | "adjacent";

export type GameStatus = {
  isSolved: boolean;
  queenCount: number;
  conflicts: Set<string>;
  conflictHints: Record<ViolationKind, Set<string>>;
  violations: Record<ViolationKind, number>;
};
