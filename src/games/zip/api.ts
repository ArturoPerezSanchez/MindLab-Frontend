import { apiPath } from "@/shared/api";
import { rememberPuzzleHandleFrom, squareDifficulty } from "@/shared/puzzleHandles";
import type { Puzzle, Wall, ZipResponse } from "./types";

function isBoard(value: unknown, size: number): value is Puzzle["board"] {
  if (
    !Array.isArray(value) ||
    value.length !== size ||
    !value.every((row) => Array.isArray(row) && row.length === size)
  ) {
    return false;
  }

  const cells = value.flat();
  if (!cells.every((cell) => cell === null || (Number.isInteger(cell) && Number(cell) > 0))) {
    return false;
  }

  const clues = cells.filter((cell): cell is number => typeof cell === "number").sort((a, b) => a - b);
  return (
    clues.length >= 2 &&
    clues.every((clue, index) => clue === index + 1)
  );
}

function isWall(value: unknown, size: number): value is Wall {
  if (!value || typeof value !== "object") {
    return false;
  }

  const wall = value as Partial<Wall>;
  return (
    Number.isInteger(wall.row) &&
    Number.isInteger(wall.col) &&
    Number(wall.row) >= 0 &&
    Number(wall.col) >= 0 &&
    (wall.direction === "right" || wall.direction === "down") &&
    (wall.direction === "right" ? Number(wall.col) < size - 1 : Number(wall.row) < size - 1)
  );
}

export async function fetchPuzzle(size: number, signal?: AbortSignal): Promise<Puzzle> {
  const params = new URLSearchParams({ board_size: String(size) });
  const response = await fetch(`${apiPath("/zip")}?${params}`, { signal });

  if (!response.ok) {
    throw new Error(`Puzzle generation failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as ZipResponse;
  if (
    payload.board_size !== size ||
    !isBoard(payload.board, size) ||
    !Array.isArray(payload.walls) ||
    !payload.walls.every((wall) => isWall(wall, size))
  ) {
    throw new Error("The API returned an invalid Zip puzzle.");
  }

  rememberPuzzleHandleFrom("zip", squareDifficulty(size), payload);

  return {
    size,
    board: payload.board,
    walls: payload.walls,
  };
}
