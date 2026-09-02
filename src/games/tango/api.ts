import { apiPath } from "@/shared/api";
import { rememberPuzzleHandleFrom, squareDifficulty } from "@/shared/puzzleHandles";
import type { CellValue, Constraint, Puzzle, TangoResponse } from "./types";

function isCell(value: unknown): value is CellValue {
  return value === null || value === 0 || value === 1;
}

function isBoard(value: unknown, size: number): value is CellValue[][] {
  return (
    Array.isArray(value) &&
    value.length === size &&
    value.every(
      (row) => Array.isArray(row) && row.length === size && row.every((cell) => isCell(cell)),
    )
  );
}

function isConstraint(value: unknown, size: number): value is Constraint {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<Constraint>;
  const secondRow = candidate.direction === "vertical" ? Number(candidate.row) + 1 : candidate.row;
  const secondCol = candidate.direction === "horizontal" ? Number(candidate.col) + 1 : candidate.col;

  return (
    Number.isInteger(candidate.row) &&
    Number.isInteger(candidate.col) &&
    (candidate.direction === "horizontal" || candidate.direction === "vertical") &&
    (candidate.relation === "same" || candidate.relation === "different") &&
    Number(candidate.row) >= 0 &&
    Number(candidate.col) >= 0 &&
    Number(secondRow) < size &&
    Number(secondCol) < size
  );
}

/**
 * Fetches a puzzle. The answer stays on the server so a recorded result can be
 * checked against it; the hint and reveal buttons request it separately.
 */
export async function fetchPuzzle(size: number, signal?: AbortSignal): Promise<Puzzle> {
  const params = new URLSearchParams({ board_size: String(size) });
  const response = await fetch(`${apiPath("/tango")}?${params}`, { signal });

  if (!response.ok) {
    throw new Error(`Puzzle generation failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as TangoResponse;
  if (
    payload.board_size !== size ||
    !isBoard(payload.board, size) ||
    !Array.isArray(payload.constraints) ||
    !payload.constraints.every((constraint) => isConstraint(constraint, size))
  ) {
    throw new Error("The API returned an invalid Tango puzzle.");
  }

  rememberPuzzleHandleFrom("tango", squareDifficulty(size), payload);

  return {
    size,
    board: payload.board,
    constraints: payload.constraints,
  };
}
