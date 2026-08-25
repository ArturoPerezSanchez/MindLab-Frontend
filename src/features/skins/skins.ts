import type { GameId } from "@/shared/gameOptions";
import { GAME_OPTIONS } from "@/shared/gameOptions";
import {
  findPalette,
  findTint,
  gameTints,
  GAME_PALETTES,
  type PaletteOption,
  type TintOption,
} from "./palettes";
import { GAME_PART_ORDER, PART_RESOLVERS, partDefinition, partOption } from "./parts";
import { defaultPreset, findPreset, type SkinPreset } from "./presets";
import {
  PALETTE_PART,
  TINT_PART,
  type AssetPart,
  type BoardSurface,
  type GameSkinAssetMap,
  type SkinPreview,
  type SkinUnlock,
} from "./types";

export type {
  BoardHudStyle,
  BoardSurface,
  ChessPieceSource,
  FlowParticle,
  GameSkinAssetMap,
  MineHud,
  PartOption,
  SkinPreview,
  SkinSymbolAsset,
  SkinUnlock,
} from "./types";
export type { PaletteOption, TintOption } from "./palettes";
export { GAME_PALETTES, gameTints, paletteStyleSheet, paletteToken } from "./palettes";
export { GAME_ASSET_PARTS, GAME_PART_ORDER } from "./parts";
export { PALETTE_PART, TINT_PART } from "./types";

const GAME_IDS = GAME_OPTIONS.map((option) => option.id) as readonly GameId[];

/**
 * What a player has chosen for one game: one option id per part id. There is no
 * preset id in the stored shape. Presets survive only as the source of the
 * defaults and as the target of the v1 migration.
 */
export type GameCustomization = Readonly<Record<string, string>>;

export type GameSkinSelections = Record<GameId, GameCustomization>;

export type ResolvedGameSkin<G extends GameId = GameId> = {
  gameId: G;
  /**
   * The game's own asset roles, plus the material the chosen board supplies.
   * `surface` is an intersection rather than a field on each game's entry
   * because it comes from the board, not from a sprite slot, and is identical
   * for all seven games.
   */
  assets: GameSkinAssetMap[G] & { surface?: BoardSurface };
  palette: PaletteOption;
  tint: TintOption | null;
  /** True when any chosen asset is pixel art and must not be smoothed. */
  pixelated: boolean;
};

/* ------------------------------------------------------------------- slots -- */

/**
 * The config screen treats colour and asset parts identically: a labelled
 * column of options it can step through. Both kinds are flattened into this one
 * shape so the UI needs no per-part branching.
 */
export type SlotPreview =
  | { kind: "images"; sources: readonly string[]; presentation: SkinPreview["presentation"] }
  | { kind: "swatch"; colors: readonly string[] };

export type SkinSlotOption = {
  id: string;
  name: string;
  description: string;
  preview: SlotPreview;
  unlock?: SkinUnlock;
};

export type SkinSlot = {
  id: string;
  label: string;
  hint: string;
  options: readonly SkinSlotOption[];
};

export function assetPartIds(gameId: GameId): readonly string[] {
  return GAME_PART_ORDER[gameId] as readonly string[];
}

export function assetPart(gameId: GameId, partId: string): AssetPart<unknown> {
  const definition = partDefinition(gameId, partId);
  if (!definition) {
    throw new Error(`Unknown ${gameId} part: ${partId}`);
  }
  return definition;
}

export function hasTint(gameId: GameId): boolean {
  return gameTints(gameId).length > 0;
}

function colourSlots(gameId: GameId): SkinSlot[] {
  const slots: SkinSlot[] = [
    {
      id: PALETTE_PART,
      label: "Board",
      hint: "Surface, colours, and the status bar that comes with them.",
      options: GAME_PALETTES[gameId].map((palette) => ({
        id: palette.id,
        name: palette.name,
        description: palette.description,
        preview: { kind: "swatch", colors: palette.swatch },
        unlock: palette.unlock,
      })),
    },
  ];

  const tints = gameTints(gameId);
  if (tints.length > 0) {
    slots.push({
      id: TINT_PART,
      label: gameId === "lights" ? "Bulb colour" : "Arrow colour",
      hint: gameId === "lights" ? "The colour a lit cell glows." : "The colour of the route.",
      options: tints.map((tint) => ({
        id: tint.id,
        name: tint.name,
        description: tint.description,
        preview: { kind: "swatch", colors: tint.swatch },
        unlock: tint.unlock,
      })),
    });
  }

  return slots;
}

/** Every customisable column for a game, in display order. */
export function gameSlots(gameId: GameId): readonly SkinSlot[] {
  const assetSlots = assetPartIds(gameId).map((partId) => {
    const part = assetPart(gameId, partId);
    return {
      id: partId,
      label: part.label,
      hint: part.hint,
      options: part.options.map((option) => ({
        id: option.id,
        name: option.name,
        description: option.description,
        preview: {
          kind: "images" as const,
          sources: option.preview.sources,
          presentation: option.preview.presentation,
        },
        unlock: option.unlock,
      })),
    };
  });

  return [...colourSlots(gameId), ...assetSlots];
}

export function allPartIds(gameId: GameId): readonly string[] {
  return gameSlots(gameId).map((slot) => slot.id);
}

/* ----------------------------------------------------------------- unlocks -- */

export function isUnlocked(
  candidate: { unlock?: SkinUnlock },
  unlockedAchievementIds: ReadonlySet<string>,
): boolean {
  const unlock = candidate.unlock ?? { type: "starter" };
  return unlock.type === "starter" || unlockedAchievementIds.has(unlock.achievementId);
}

export function isPartOptionUnlocked(
  gameId: GameId,
  partId: string,
  optionId: string,
  unlockedAchievementIds: ReadonlySet<string>,
): boolean {
  if (partId === PALETTE_PART) {
    const palette = findPalette(gameId, optionId);
    return Boolean(palette && isUnlocked(palette, unlockedAchievementIds));
  }
  if (partId === TINT_PART) {
    const tint = findTint(gameId, optionId);
    return Boolean(tint && isUnlocked(tint, unlockedAchievementIds));
  }
  const option = partOption(gameId, partId, optionId);
  return Boolean(option && isUnlocked(option, unlockedAchievementIds));
}

/* --------------------------------------------------------------- defaults --- */

function fallbackOptionId(gameId: GameId, partId: string): string {
  if (partId === PALETTE_PART) {
    return GAME_PALETTES[gameId][0].id;
  }
  if (partId === TINT_PART) {
    return gameTints(gameId)[0]?.id ?? "";
  }
  return assetPart(gameId, partId).options[0].id;
}

function partsFromPreset(gameId: GameId, preset: SkinPreset): GameCustomization {
  const parts: Record<string, string> = {};
  for (const partId of allPartIds(gameId)) {
    parts[partId] = preset.selections[partId] ?? fallbackOptionId(gameId, partId);
  }
  return parts;
}

export function defaultCustomization(gameId: GameId): GameCustomization {
  return partsFromPreset(gameId, defaultPreset(gameId));
}

/** Used only by the v1 storage migration, which stored a single skin id. */
export function customizationFromLegacySkinId(
  gameId: GameId,
  skinId: string,
): GameCustomization | null {
  const preset = findPreset(gameId, skinId);
  return preset ? partsFromPreset(gameId, preset) : null;
}

export const DEFAULT_GAME_SKINS: GameSkinSelections = Object.fromEntries(
  GAME_IDS.map((gameId) => [gameId, defaultCustomization(gameId)]),
) as GameSkinSelections;

/**
 * Drops part ids the game no longer has and replaces unknown or still-locked
 * option ids with the default, so revoking an achievement can never leave a
 * board pointing at artwork the player cannot use.
 */
export function sanitizeCustomization(
  gameId: GameId,
  candidate: Readonly<Record<string, unknown>> | undefined,
  unlockedAchievementIds: ReadonlySet<string>,
): GameCustomization {
  const parts: Record<string, string> = {};
  for (const partId of allPartIds(gameId)) {
    const requested = candidate?.[partId];
    parts[partId] =
      typeof requested === "string" &&
      isPartOptionUnlocked(gameId, partId, requested, unlockedAchievementIds)
        ? requested
        : fallbackOptionId(gameId, partId);
  }
  return parts;
}

export function isDefaultCustomization(
  gameId: GameId,
  customization: GameCustomization,
): boolean {
  const defaults = DEFAULT_GAME_SKINS[gameId];
  return allPartIds(gameId).every((partId) => customization[partId] === defaults[partId]);
}

/* ---------------------------------------------------------------- resolve --- */

export function resolveGameSkin<G extends GameId>(
  gameId: G,
  customization: GameCustomization,
): ResolvedGameSkin<G> {
  const values: Record<string, unknown> = {};
  let pixelated = false;

  for (const partId of assetPartIds(gameId)) {
    const part = assetPart(gameId, partId);
    const chosen =
      part.options.find((option) => option.id === customization[partId]) ?? part.options[0];
    values[partId] = chosen.value;
    pixelated = pixelated || chosen.pixelated === true;
  }

  const resolve = PART_RESOLVERS[gameId] as (input: unknown) => GameSkinAssetMap[G];
  const palette = findPalette(gameId, customization[PALETTE_PART]) ?? GAME_PALETTES[gameId][0];
  const tint = findTint(gameId, customization[TINT_PART] ?? "") ?? gameTints(gameId)[0] ?? null;
  const extras = palette.extras;

  // Chrome travels with the board, but renderers still read it off `assets`, so
  // it is merged in here rather than being threaded through every game.
  const assets = resolve(values);
  if (extras && (extras.hud || extras.clueTiles)) {
    Object.assign(assets, { hud: extras.hud, clueTiles: extras.clueTiles });
  }
  if (extras?.surface) {
    Object.assign(assets, { surface: extras.surface });
  }

  return {
    gameId,
    assets,
    palette,
    tint,
    pixelated: pixelated || extras?.pixelated === true,
  };
}
