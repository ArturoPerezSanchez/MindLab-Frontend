import { useEffect, useRef, useState } from "react";

/**
 * Holds the win popup back while a board plays a short celebration.
 *
 * Every game solves differently but the shape is the same: the moment the
 * board is solved, run an animation for a beat, then reveal the result. This
 * hook owns that timing so each game only has to draw.
 *
 * `progress` runs 0 -> 1 over the sequence and is driven by rAF, so canvases
 * can ease off it directly instead of keeping their own clock. `elapsed` is
 * exposed for effects that want real milliseconds (sweeps, scanners).
 */

export const WIN_SEQUENCE_MS = 1200;

export type WinSequence = {
  /** True from the moment the board is solved until the popup is due. */
  isCelebrating: boolean;
  /** True once the celebration has finished and the popup should show. */
  isRevealed: boolean;
  /** 0 -> 1 across the celebration, 1 once finished. */
  progress: number;
  /** Milliseconds since the celebration started, 0 before it does. */
  elapsed: number;
};

type Options = {
  /** Set true the instant the board is solved. */
  solved: boolean;
  /** Restart the sequence when this changes, e.g. a new puzzle. */
  runKey?: unknown;
  /** Overrides the default duration. */
  durationMs?: number;
  /** Skip the animation entirely, e.g. when a solution was revealed. */
  skip?: boolean;
};

export function useWinSequence({
  solved,
  runKey,
  durationMs = WIN_SEQUENCE_MS,
  skip = false,
}: Options): WinSequence {
  const [elapsed, setElapsed] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    setElapsed(0);
    setIsRevealed(false);
  }, [runKey]);

  useEffect(() => {
    if (!solved) {
      setElapsed(0);
      setIsRevealed(false);
      return;
    }

    if (skip) {
      setElapsed(durationMs);
      setIsRevealed(true);
      return;
    }

    const startedAt = performance.now();
    const step = () => {
      const since = performance.now() - startedAt;
      setElapsed(Math.min(since, durationMs));
      if (since >= durationMs) {
        setIsRevealed(true);
        return;
      }
      frameRef.current = requestAnimationFrame(step);
    };
    frameRef.current = requestAnimationFrame(step);

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [durationMs, skip, solved]);

  return {
    isCelebrating: solved && !isRevealed,
    isRevealed: solved && isRevealed,
    progress: durationMs > 0 ? Math.min(1, elapsed / durationMs) : 1,
    elapsed,
  };
}

/** Ease-out cubic. Fast start, soft landing - reads well for reveals. */
export function easeOut(t: number): number {
  return 1 - (1 - t) ** 3;
}

/**
 * Staggers a set of items across the sequence.
 *
 * Returns each item's own 0 -> 1 progress given the overall progress, so a
 * board can light cells up in order rather than all at once. `order` is the
 * item's index in whatever sequence the game chose, `count` the total.
 */
export function staggeredProgress(
  progress: number,
  order: number,
  count: number,
  overlap = 0.55,
): number {
  if (count <= 1) {
    return progress;
  }
  const span = 1 / (count - (count - 1) * overlap);
  const start = order * span * (1 - overlap);
  return Math.max(0, Math.min(1, (progress - start) / span));
}

/** The sweep patterns Lights picks from when a board is solved. */
export const LIGHTS_SWEEPS = [
  "left-to-right",
  "top-to-bottom",
  "diagonal",
  "rings",
  "scatter",
] as const;

export type LightsSweep = (typeof LIGHTS_SWEEPS)[number];

/**
 * Orders cells for a sweep pattern, returning each cell's position in the
 * stagger. Kept here rather than in the Lights canvas so it can be unit
 * tested without a rendering context.
 */
export function sweepOrder(
  sweep: LightsSweep,
  row: number,
  col: number,
  size: number,
): number {
  const centre = (size - 1) / 2;
  switch (sweep) {
    case "left-to-right":
      return col;
    case "top-to-bottom":
      return row;
    case "diagonal":
      return row + col;
    case "rings":
      return Math.round(Math.hypot(row - centre, col - centre));
    case "scatter":
      // Deterministic per cell so a repaint does not reshuffle mid-animation.
      return (row * 7 + col * 13) % size;
  }
}

export function pickLightsSweep(): LightsSweep {
  return LIGHTS_SWEEPS[Math.floor(Math.random() * LIGHTS_SWEEPS.length)];
}
