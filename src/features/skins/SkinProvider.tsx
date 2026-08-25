import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { GameId } from "@/shared/gameOptions";
import { SkinContext } from "./SkinContext";
import { paletteStyleSheet } from "./palettes";
import {
  customizationFromLegacySkinId,
  DEFAULT_GAME_SKINS,
  isPartOptionUnlocked,
  sanitizeCustomization,
  type GameCustomization,
  type GameSkinSelections,
} from "./skins";

const STORAGE_KEY = "mindlab-game-skins-v2";
/** Selections written before skins were split into parts. */
const LEGACY_STORAGE_KEY = "mindlab-game-skins-v1";
const STYLE_ELEMENT_ID = "mindlab-palette-tokens";
const NO_ACHIEVEMENTS: readonly string[] = [];

type StoredShape = Partial<Record<string, Readonly<Record<string, unknown>>>>;

const GAME_IDS = Object.keys(DEFAULT_GAME_SKINS) as GameId[];

/**
 * v1 stored one skin id per game. Those ids were kept as the preset ids, so the
 * migration expands each one into the full set of parts it stood for.
 */
function readLegacySelections(): StoredShape {
  try {
    const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const stored = JSON.parse(raw) as Record<string, unknown>;
    const migrated: StoredShape = {};
    for (const gameId of GAME_IDS) {
      const skinId = stored[gameId];
      if (typeof skinId !== "string") {
        continue;
      }
      const parts = customizationFromLegacySkinId(gameId, skinId);
      if (parts) {
        migrated[gameId] = parts;
      }
    }
    return migrated;
  } catch {
    return {};
  }
}

function parseStoredSelections(
  value: string | null,
  unlocked: ReadonlySet<string>,
): GameSkinSelections {
  let stored: StoredShape = {};
  try {
    stored = value ? (JSON.parse(value) as StoredShape) : readLegacySelections();
  } catch {
    stored = {};
  }

  return Object.fromEntries(
    GAME_IDS.map((gameId) => [gameId, sanitizeCustomization(gameId, stored[gameId], unlocked)]),
  ) as GameSkinSelections;
}

function writeStoredSelections(selections: GameSkinSelections): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(selections));
  } catch {
    // Keep the current session usable when browser storage is unavailable.
  }
}

/**
 * Palette and tint tokens are generated from data rather than hand-written CSS,
 * so they are injected once into a single style element instead of shipping a
 * rule per palette in the stylesheet.
 */
function usePaletteStyleSheet(): void {
  useEffect(() => {
    let element = document.getElementById(STYLE_ELEMENT_ID) as HTMLStyleElement | null;
    if (!element) {
      element = document.createElement("style");
      element.id = STYLE_ELEMENT_ID;
      document.head.append(element);
    }
    element.textContent = paletteStyleSheet();
  }, []);
}

export function SkinProvider({
  children,
  unlockedAchievementIds = NO_ACHIEVEMENTS,
}: {
  children: ReactNode;
  unlockedAchievementIds?: readonly string[];
}) {
  const unlockedAchievements = useMemo(
    () => new Set(unlockedAchievementIds),
    [unlockedAchievementIds],
  );
  const [rawSelections, setRawSelections] = useState<GameSkinSelections>(() =>
    parseStoredSelections(window.localStorage.getItem(STORAGE_KEY), new Set()),
  );

  usePaletteStyleSheet();

  // Achievements can arrive after the first render, so anything the player is
  // no longer entitled to is folded back to the default here rather than at
  // write time.
  const selectedSkins = useMemo(
    () =>
      Object.fromEntries(
        GAME_IDS.map((gameId) => [
          gameId,
          sanitizeCustomization(gameId, rawSelections[gameId], unlockedAchievements),
        ]),
      ) as GameSkinSelections,
    [rawSelections, unlockedAchievements],
  );

  useEffect(() => {
    const refreshFromStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        setRawSelections(parseStoredSelections(event.newValue, new Set()));
      }
    };
    window.addEventListener("storage", refreshFromStorage);
    return () => window.removeEventListener("storage", refreshFromStorage);
  }, []);

  const commit = useCallback((gameId: GameId, next: GameCustomization) => {
    setRawSelections((current) => {
      const updated = { ...current, [gameId]: next };
      writeStoredSelections(updated);
      return updated;
    });
  }, []);

  const isPartUnlocked = useCallback(
    (gameId: GameId, partId: string, optionId: string) =>
      isPartOptionUnlocked(gameId, partId, optionId, unlockedAchievements),
    [unlockedAchievements],
  );

  const selectPart = useCallback(
    (gameId: GameId, partId: string, optionId: string) => {
      const current = selectedSkins[gameId];
      if (current[partId] === optionId || !isPartUnlocked(gameId, partId, optionId)) {
        return;
      }
      commit(gameId, { ...current, [partId]: optionId });
    },
    [commit, isPartUnlocked, selectedSkins],
  );

  const resetGame = useCallback(
    (gameId: GameId) => {
      commit(gameId, DEFAULT_GAME_SKINS[gameId]);
    },
    [commit],
  );

  const value = useMemo(
    () => ({ selectedSkins, selectPart, resetGame, isPartUnlocked }),
    [isPartUnlocked, resetGame, selectPart, selectedSkins],
  );

  return <SkinContext.Provider value={value}>{children}</SkinContext.Provider>;
}
