import { apiPath } from "@/shared/api";
import { rememberPuzzleHandleFrom, squareDifficulty } from "@/shared/puzzleHandles";
import type { Board, LightsResponse, Puzzle } from "./types";

function isBoard(value: unknown, size: number): value is Board {
  return (
    Array.isArray(value) &&
    value.length === size &&
    value.every(
      (row) =>
        Array.isArray(row) &&
        row.length === size &&
        row.every((cell) => cell === 0 || cell === 1),
    )
  );
}

export async function fetchPuzzle(size: number, signal?: AbortSignal): Promise<Puzzle> {
  const params = new URLSearchParams({ board_size: String(size) });
  const response = await fetch(`${apiPath("/lights")}?${params}`, { signal });

  if (!response.ok) {
    throw new Error(`Puzzle generation failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as LightsResponse;
  if (
    payload.board_size !== size ||
    !isBoard(payload.board, size)
  ) {
    throw new Error("The API returned an invalid Lights puzzle.");
  }

  rememberPuzzleHandleFrom("lights", squareDifficulty(size), payload);

  return {
    size,
    board: payload.board,
  };
}
