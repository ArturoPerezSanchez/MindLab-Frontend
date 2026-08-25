/**
 * Tracks the signed handle the API issued for the puzzle currently in play.
 *
 * The backend requires this handle when a result is recorded, so it can tie the
 * result to a puzzle it actually generated instead of trusting whatever the
 * client asserts. Games do not need to thread it through their own state: each
 * `fetchPuzzle` records the handle here, and the result reporter reads it back
 * using the same game and difficulty it reports.
 */

const handles = new Map<string, string>();

function key(game: string, difficulty: string): string {
  return `${game}:${difficulty}`;
}

/** Records the handle returned alongside a freshly generated puzzle. */
export function rememberPuzzleHandle(
  game: string,
  difficulty: string,
  handle: string | undefined,
): void {
  if (handle) {
    handles.set(key(game, difficulty), handle);
  }
}

/**
 * Pulls `puzzle_handle` out of a generator response and records it.
 *
 * Every `/api/v1` puzzle endpoint includes the field, but it is read
 * defensively so a stale backend simply leaves the handle unset rather than
 * breaking puzzle loading.
 */
export function rememberPuzzleHandleFrom(
  game: string,
  difficulty: string,
  payload: unknown,
): void {
  const handle = (payload as { puzzle_handle?: unknown } | null)?.puzzle_handle;
  rememberPuzzleHandle(game, difficulty, typeof handle === "string" ? handle : undefined);
}

/** Reads the handle for the puzzle most recently generated for this board. */
export function takePuzzleHandle(game: string, difficulty: string): string | undefined {
  return handles.get(key(game, difficulty));
}

/** Drops every stored handle. Intended for tests. */
export function clearPuzzleHandles(): void {
  handles.clear();
}

/** Convenience for the square boards every game except MiniChess uses. */
export function squareDifficulty(size: number): string {
  return `${size}x${size}`;
}
