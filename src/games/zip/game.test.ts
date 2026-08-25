import { describe, expect, it } from "vitest";
import {
  areAdjacent,
  createInitialPath,
  createWallSet,
  edgeKey,
  findClue,
  highestClue,
  isSolved,
  tryStep,
} from "./game";
import type { Position, Puzzle } from "./types";

/**
 * A 2x2 board where the clues run 1 -> 2 diagonally, so the only complete
 * path is (0,0) -> (0,1) -> (1,1) -> (1,0) or its mirror.
 */
function puzzle(overrides: Partial<Puzzle> = {}): Puzzle {
  return {
    size: 2,
    board: [
      [1, null],
      [null, 2],
    ],
    walls: [],
    solution: [
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 0],
    ],
    ...overrides,
  };
}

describe("adjacency and edges", () => {
  it("treats only orthogonal neighbours as adjacent", () => {
    expect(areAdjacent([0, 0], [0, 1])).toBe(true);
    expect(areAdjacent([0, 0], [1, 1])).toBe(false);
    expect(areAdjacent([0, 0], [0, 0])).toBe(false);
  });

  it("builds the same edge key regardless of direction", () => {
    expect(edgeKey([0, 0], [0, 1])).toBe(edgeKey([0, 1], [0, 0]));
  });
});

describe("createWallSet", () => {
  it("maps a wall onto the edge it blocks", () => {
    const walls = createWallSet([{ row: 0, col: 0, direction: "right" }]);
    expect(walls.has(edgeKey([0, 0], [0, 1]))).toBe(true);
    expect(walls.has(edgeKey([0, 0], [1, 0]))).toBe(false);
  });
});

describe("clues", () => {
  it("finds a clue position and the highest clue", () => {
    expect(findClue(puzzle().board, 1)).toEqual([0, 0]);
    expect(highestClue(puzzle().board)).toBe(2);
  });

  it("starts the path on clue 1", () => {
    expect(createInitialPath(puzzle())).toEqual([[0, 0]]);
  });
});

describe("tryStep", () => {
  const start: Position[] = [[0, 0]];

  it("accepts an adjacent unvisited cell", () => {
    const result = tryStep(start, [0, 1], puzzle());
    expect(result.accepted).toBe(true);
  });

  it("rejects a diagonal move", () => {
    const result = tryStep(start, [1, 1], puzzle());
    expect(result.accepted).toBe(false);
  });

  it("rejects a move through a wall", () => {
    const walled = puzzle({ walls: [{ row: 0, col: 0, direction: "right" }] });
    const result = tryStep(start, [0, 1], walled);
    expect(result.accepted).toBe(false);
  });

  it("treats a no-op step as accepted but unchanged", () => {
    const result = tryStep(start, [0, 0], puzzle());
    expect(result).toMatchObject({ accepted: true, changed: false });
  });
});

describe("isSolved", () => {
  it("requires every cell to be visited in clue order", () => {
    expect(isSolved(puzzle().solution as Position[], puzzle())).toBe(true);
    expect(isSolved([[0, 0]], puzzle())).toBe(false);
  });
});
