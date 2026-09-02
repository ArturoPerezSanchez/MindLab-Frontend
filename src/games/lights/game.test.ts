import { describe, expect, it } from "vitest";
import {
  affectedCells,
  cloneBoard,
  isSolved,
  litCount,
  pressCell,
  solveBoard,
  solvesBoard,
} from "./game";
import type { Board } from "./types";

function board(rows: string[]): Board {
  return rows.map((row) => [...row].map((cell) => (cell === "#" ? 1 : 0)));
}

describe("affectedCells", () => {
  it("returns the pressed cell plus its orthogonal neighbours", () => {
    expect(affectedCells(1, 1, 4).sort()).toEqual(
      [
        [1, 1],
        [0, 1],
        [2, 1],
        [1, 0],
        [1, 2],
      ].sort(),
    );
  });

  it("clips neighbours that fall outside the board", () => {
    expect(affectedCells(0, 0, 4)).toHaveLength(3);
  });
});

describe("pressCell", () => {
  it("toggles the cross without mutating the input", () => {
    const start = board(["0000", "0000", "0000", "0000"]);
    const snapshot = cloneBoard(start);
    const next = pressCell(start, 1, 1);

    expect(start).toEqual(snapshot);
    expect(litCount(next)).toBe(5);
  });

  it("is its own inverse", () => {
    const start = board(["0000", "00#0", "0000", "0000"]);
    expect(pressCell(pressCell(start, 2, 2), 2, 2)).toEqual(start);
  });
});

describe("isSolved", () => {
  it("is true only when every light is on", () => {
    expect(isSolved(board(["####", "####", "####", "####"]))).toBe(true);
    expect(isSolved(board(["####", "##0#", "####", "####"]))).toBe(false);
  });
});

describe("solveBoard", () => {
  it("returns presses that clear the board", () => {
    const puzzle = pressCell(pressCell(board(["0000", "0000", "0000", "0000"]), 0, 1), 2, 3);
    const presses = solveBoard(puzzle);

    expect(presses).not.toBeNull();
    expect(solvesBoard(puzzle, presses!)).toBe(true);
  });

  it("solves an already-lit board with no presses", () => {
    expect(solveBoard(board(["####", "####", "####", "####"]))).toEqual([]);
  });
});
