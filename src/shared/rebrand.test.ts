import { describe, expect, it } from "vitest";
import { migrateBrandStorage } from "./rebrand";

function storage(values: Record<string, string>): Storage {
  const data = { ...values };
  Object.defineProperties(data, {
    getItem: { value: (key: string) => data[key] ?? null },
    setItem: { value: (key: string, value: string) => { data[key] = value; } },
  });
  return data as unknown as Storage;
}

describe("Mindora storage import", () => {
  it("keeps opaque session tokens and migrates game selections without deleting old data", () => {
    const saved = storage({
      "mindlab-auth-token": "queens.zip.tango",
      "mindlab-game-skins-v2": '{"queens":"retro_queens","tango":"sunny_meadows","zip":"pirate_cove"}',
      "queens-show-patterns": "true",
    });
    migrateBrandStorage(saved);
    expect(saved.getItem("mindora-auth-token")).toBe("queens.zip.tango");
    expect(JSON.parse(saved.getItem("mindora-game-skins-v2")!)).toEqual({
      thrones: "retro_thrones", eclipse: "sunny_meadows", dash: "pirate_cove",
    });
    expect(saved.getItem("thrones-show-patterns")).toBe("true");
    expect(saved.getItem("mindlab-auth-token")).toBe("queens.zip.tango");
  });
  it("never overwrites a preference already stored using the new name", () => {
    const saved = storage({ "queens-show-patterns": "true", "thrones-show-patterns": "false" });
    migrateBrandStorage(saved);
    migrateBrandStorage(saved);
    expect(saved.getItem("thrones-show-patterns")).toBe("false");
  });
});
