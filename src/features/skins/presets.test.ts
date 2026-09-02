import { describe, expect, it } from "vitest";
import { GAME_PRESETS } from "./presets";

describe("game skin catalog", () => {
  it("keeps multiple named, uniquely keyed presets for every game", () => {
    for (const [game, presets] of Object.entries(GAME_PRESETS)) {
      expect(presets.length, `${game} should offer several complete skins`).toBeGreaterThanOrEqual(4);
      expect(new Set(presets.map((preset) => preset.id)).size).toBe(presets.length);
      expect(presets.every((preset) => preset.name.trim() && preset.description.trim())).toBe(true);
    }
  });
});
