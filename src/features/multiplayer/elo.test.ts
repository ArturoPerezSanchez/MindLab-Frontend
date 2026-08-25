import { describe, expect, it } from "vitest";
import { applyGameRatings, standingsFromElimination, DEFAULT_ELO } from "./elo";

const player = (id: string, position: number, elo = DEFAULT_ELO, gamesPlayed = 50) => ({
  id,
  elo,
  gamesPlayed,
  position,
});

describe("applyGameRatings", () => {
  it("rewards the winner and penalises the last place", () => {
    const [first, , last] = applyGameRatings([
      player("a", 1),
      player("b", 2),
      player("c", 3),
    ]);
    expect(first.delta).toBeGreaterThan(0);
    expect(last.delta).toBeLessThan(0);
  });

  it("stays close to zero-sum across an even field", () => {
    const total = applyGameRatings([
      player("a", 1),
      player("b", 2),
      player("c", 3),
      player("d", 4),
    ]).reduce((sum, result) => sum + result.delta, 0);
    expect(Math.abs(total)).toBeLessThanOrEqual(2);
  });

  it("gives a bigger gain for beating a stronger field", () => {
    const weakField = applyGameRatings([player("a", 1), player("b", 2, 800)])[0];
    const strongField = applyGameRatings([player("a", 1), player("b", 2, 1600)])[0];
    expect(strongField.delta).toBeGreaterThan(weakField.delta);
  });

  it("moves provisional players further than established ones", () => {
    const provisional = applyGameRatings([player("a", 1, DEFAULT_ELO, 0), player("b", 2)])[0];
    const established = applyGameRatings([player("a", 1), player("b", 2)])[0];
    expect(provisional.delta).toBeGreaterThan(established.delta);
  });

  it("never drops a rating below the floor", () => {
    const [result] = applyGameRatings([player("a", 2, 100), player("b", 1, 2400)]);
    expect(result.after).toBeGreaterThanOrEqual(100);
  });

  it("treats a solo table as a no-op", () => {
    expect(applyGameRatings([player("a", 1)])[0].delta).toBe(0);
    expect(applyGameRatings([])).toEqual([]);
  });
});

describe("standingsFromElimination", () => {
  it("places the winner first and later exits higher", () => {
    const standings = standingsFromElimination(
      new Map([
        ["c", 1],
        ["b", 2],
      ]),
      "a",
    );
    expect(standings.get("a")).toBe(1);
    expect(standings.get("b")).toBe(2);
    expect(standings.get("c")).toBe(3);
  });

  it("ties players eliminated in the same round", () => {
    const standings = standingsFromElimination(
      new Map([
        ["b", 2],
        ["c", 2],
        ["d", 1],
      ]),
      "a",
    );
    expect(standings.get("b")).toBe(2);
    expect(standings.get("c")).toBe(2);
    expect(standings.get("d")).toBe(4);
  });
});
