import { apiPath } from "@/shared/api";
import { rememberPuzzleHandleFrom, squareDifficulty } from "@/shared/puzzleHandles";
import type { Board, MineIslandsResponse, Puzzle } from "./types";

function isBlankBoard(value: unknown, size: number): value is null[][] {
  return (
    Array.isArray(value) &&
    value.length === size &&
    value.every((row) => Array.isArray(row) && row.length === size && row.every((cell) => cell === null))
  );
}

function unknownValues(size: number): Board {
  return Array.from({ length: size }, () => Array.from({ length: size }, () => 0));
}

export async function fetchPuzzle(size: number, signal?: AbortSignal): Promise<Puzzle> {
  const params = new URLSearchParams({ board_size: String(size) });
  const response = await fetch(`${apiPath("/mine-islands")}?${params}`, { signal });

  if (!response.ok) {
    throw new Error(`Puzzle generation failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as MineIslandsResponse;
  if (
    payload.board_size !== size ||
    !Number.isInteger(payload.mine_count) ||
    payload.mine_count <= 0 ||
    payload.mine_count >= size * size ||
    typeof payload.puzzle_handle !== "string" ||
    !isBlankBoard(payload.board, size)
  ) {
    throw new Error("The API returned an invalid Mine Islands puzzle.");
  }

  rememberPuzzleHandleFrom("mine-islands", squareDifficulty(size), payload);

  return {
    size,
    mineCount: payload.mine_count,
    puzzleHandle: payload.puzzle_handle,
    values: unknownValues(size),
  };
}
