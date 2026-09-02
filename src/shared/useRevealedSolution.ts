import { useCallback, useEffect, useState } from "react";

import { revealSolution } from "@/shared/gamesApi";
import { takePuzzleHandle } from "@/shared/puzzleHandles";

/**
 * Fetches the answer on demand, for games that offer a reveal or a hint.
 *
 * The answer no longer arrives with the puzzle, so a game that wants to show it
 * has to ask. Asking is recorded server-side against this puzzle, which is what
 * makes the resulting `assisted` flag trustworthy - the game does not report it
 * and cannot suppress it.
 *
 * The fetched answer is cleared whenever `runKey` changes, so a new puzzle never
 * inherits the previous one's solution.
 */
export function useRevealedSolution<T>(game: string, difficulty: string, runKey: unknown) {
  const [solution, setSolution] = useState<T | null>(null);
  const [isRevealing, setIsRevealing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSolution(null);
    setIsRevealing(false);
    setError(null);
  }, [runKey]);

  const reveal = useCallback(async (): Promise<T | null> => {
    if (solution !== null) {
      return solution;
    }

    const handle = takePuzzleHandle(game, difficulty);
    if (!handle) {
      setError("This puzzle can no longer be checked with the server.");
      return null;
    }

    setIsRevealing(true);
    setError(null);
    try {
      const answer = await revealSolution<T>(handle);
      setSolution(answer);
      return answer;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load the solution.");
      return null;
    } finally {
      setIsRevealing(false);
    }
  }, [difficulty, game, solution]);

  return { solution, reveal, isRevealing, error };
}
