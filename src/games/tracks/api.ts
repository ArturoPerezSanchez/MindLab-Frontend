import { apiPath } from "@/shared/api";
import { rememberPuzzleHandleFrom, squareDifficulty } from "@/shared/puzzleHandles";
import { isValidMask } from "./game";
import type { Board, Puzzle, TracksResponse } from "./types";

function isBoard(value: unknown, size: number): value is Board {
  return (
    Array.isArray(value) &&
    value.length === size &&
    value.every(
      (row) =>
        Array.isArray(row) &&
        row.length === size &&
        row.every((cell) => isValidMask(cell)),
    )
  );
}

function isPosition(value: unknown, size: number): value is [number, number] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    Number.isInteger(value[0]) &&
    Number.isInteger(value[1]) &&
    value[0] >= 0 &&
    value[1] >= 0 &&
    value[0] < size &&
    value[1] < size
  );
}

export async function fetchPuzzle(size: number, signal?: AbortSignal): Promise<Puzzle> {
  const params = new URLSearchParams({
    board_size: String(size),
  });
  const response = await fetch(`${apiPath("/tracks")}?${params}`, { signal });

  if (!response.ok) {
    throw new Error(`Puzzle generation failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as TracksResponse;
  if (
    payload.board_size !== size ||
    !isBoard(payload.board, size) ||
    !isPosition(payload.start, size) ||
    !isPosition(payload.end, size)
  ) {
    throw new Error("The API returned an invalid Tracks puzzle.");
  }

  rememberPuzzleHandleFrom("tracks", squareDifficulty(size), payload);

  return {
    size,
    board: payload.board,
    start: payload.start,
    end: payload.end,
  };
}
