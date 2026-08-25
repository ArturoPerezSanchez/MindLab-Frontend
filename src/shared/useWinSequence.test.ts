import { describe, expect, it } from "vitest";
import { LIGHTS_SWEEPS, easeOut, staggeredProgress, sweepOrder } from "./useWinSequence";

describe("easeOut", () => {
  it("is pinned at both ends and monotonic between", () => {
    expect(easeOut(0)).toBe(0);
    expect(easeOut(1)).toBe(1);
    expect(easeOut(0.5)).toBeGreaterThan(0.5);
  });
});

describe("staggeredProgress", () => {
  it("returns the raw progress for a single item", () => {
    expect(staggeredProgress(0.4, 0, 1)).toBe(0.4);
  });

  it("starts earlier items before later ones", () => {
    const first = staggeredProgress(0.3, 0, 5);
    const last = staggeredProgress(0.3, 4, 5);
    expect(first).toBeGreaterThan(last);
  });

  it("clamps to 0 and 1", () => {
    expect(staggeredProgress(0, 4, 5)).toBe(0);
    expect(staggeredProgress(1, 0, 5)).toBe(1);
  });

  it("has every item finished once the sequence completes", () => {
    for (let index = 0; index < 6; index += 1) {
      expect(staggeredProgress(1, index, 6)).toBe(1);
    }
  });
});

describe("sweepOrder", () => {
  it("orders left to right by column and top to bottom by row", () => {
    expect(sweepOrder("left-to-right", 3, 1, 5)).toBe(1);
    expect(sweepOrder("top-to-bottom", 3, 1, 5)).toBe(3);
  });

  it("orders the diagonal by the anti-diagonal index", () => {
    expect(sweepOrder("diagonal", 2, 2, 5)).toBe(4);
  });

  it("gives the centre cell ring zero", () => {
    expect(sweepOrder("rings", 2, 2, 5)).toBe(0);
    expect(sweepOrder("rings", 0, 2, 5)).toBe(2);
  });

  it("is deterministic so a repaint cannot reshuffle mid-animation", () => {
    expect(sweepOrder("scatter", 1, 3, 6)).toBe(sweepOrder("scatter", 1, 3, 6));
  });

  it("never returns a negative order for any pattern", () => {
    LIGHTS_SWEEPS.forEach((sweep) => {
      for (let row = 0; row < 5; row += 1) {
        for (let col = 0; col < 5; col += 1) {
          expect(sweepOrder(sweep, row, col, 5)).toBeGreaterThanOrEqual(0);
        }
      }
    });
  });
});
