import { describe, expect, it } from "vitest";
import { EAST, NORTH, NORTH_WEST, SOUTH_EAST, WEST, applyFlowHint, isSolved } from "./game";
import type { Board, Puzzle } from "./types";

const solution: Board = [
  [SOUTH_EAST, 0, 0],
  [0, NORTH_WEST | EAST, WEST],
  [0, 0, 0],
];

const puzzle: Puzzle = {
  size: 3,
  board: [
    [NORTH, 0, 0],
    [0, NORTH_WEST | EAST, WEST],
    [0, 0, 0],
  ],
  start: [0, 0],
  end: [1, 2],
};

describe("Tracks client validation", () => {
  it("recognizes a connected route without receiving the answer in the puzzle", () => {
    expect(isSolved(solution, puzzle)).toBe(true);
    expect(isSolved(puzzle.board, puzzle)).toBe(false);
  });

  it("uses a server-revealed answer for a hint only when explicitly provided", () => {
    const hinted = applyFlowHint(puzzle.board, puzzle, solution);
    expect(hinted[0][0]).toBe(SOUTH_EAST);
    expect(puzzle.board[0][0]).toBe(NORTH);
  });
});
