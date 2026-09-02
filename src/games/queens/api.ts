import { apiPath } from "@/shared/api";
import { rememberPuzzleHandleFrom, squareDifficulty } from "@/shared/puzzleHandles";
import type { Puzzle, QueensResponse } from "./types";

const API_PATH = apiPath("/queens");

function assertBoard(board: number[][], size: number): void {
  if (board.length !== size || board.some((row) => row.length !== size)) {
    throw new Error("The API returned a board with an unexpected shape.");
  }
}

/**
 * Loads a uniquely solvable Queens puzzle from the backend.
 *
 * The answer stays on the server so a recorded result can be checked against
 * it. Solve detection has always been based on the visible game rules, so it is
 * unaffected; the reveal button asks for the answer separately.
 */
export async function fetchPuzzle(size: number, signal?: AbortSignal): Promise<Puzzle> {
  const params = new URLSearchParams({ board_size: String(size) });

  const response = await fetch(`${API_PATH}?${params}`, { signal });

  if (!response.ok) {
    throw new Error(`Puzzle generation failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as QueensResponse;
  assertBoard(payload.board, size);
  rememberPuzzleHandleFrom("queens", squareDifficulty(size), payload);

  return {
    board: payload.board,
    size,
  };
}
