import type { GameId } from "@/shared/gameOptions";
import type { BoardExtras, SkinUnlock } from "./types";

/**
 * Colour is data, not CSS. Every palette and tint below is emitted into a single
 * generated stylesheet at runtime (see `paletteStyleSheet`), so adding one is a
 * data-only change and no renderer ever needs to know a palette id.
 */
export type ThemeTokens = Readonly<Record<string, string>>;

/**
 * A board is the whole surface treatment: colour tokens plus any chrome that
 * comes with it. It is called "Board" in the UI rather than "Palette" because
 * it is not always only colour.
 */
export type PaletteOption = {
  id: string;
  name: string;
  description: string;
  /** Four representative colours drawn as the picker preview. */
  swatch: readonly [string, string, string, string];
  /** Omitted means `starter`; boards are unlocked by default. */
  unlock?: SkinUnlock;
  /** Non-colour material the board brings with it. */
  extras?: BoardExtras;
  light: ThemeTokens;
  dark: ThemeTokens;
};

/**
 * A tint is a second, narrower colour part that a game layers on top of its
 * palette: the Lights bulb colour and the Zip arrow colour. Tints always win
 * over the palette because they are emitted at a higher specificity tier.
 */
export type TintOption = {
  id: string;
  name: string;
  description: string;
  swatch: readonly [string, string];
  /** Omitted means `starter`; colour parts are unlocked by default. */
  unlock?: SkinUnlock;
  light: ThemeTokens;
  dark: ThemeTokens;
};

/* -------------------------------------------------------------- materials -- */

/**
 * The shades a material offers a board, in one theme.
 *
 * Games name their surfaces differently — cells, squares, covered tiles, given
 * cells — but they all want the same handful of things from a material: a main
 * face, a second face for alternating or recessed cells, a deeper one, and an
 * edge. Naming them by role rather than by any one game's tokens is what lets a
 * single material definition serve all seven.
 */
export type MaterialShades = {
  accent: string;
  logoBg: string;
  /** The main cell face. */
  base: string;
  /** Alternating or secondary cells. */
  alt: string;
  /** Recessed cells: givens, covered tiles, empty squares. */
  deep: string;
  /**
   * The strongly contrasting face, for boards that alternate squares rather
   * than merely vary them. Chess needs its two colours far apart; a grid game
   * wants `alt`, which is a neighbour rather than an opposite.
   */
  contra: string;
  /** Frames, grid lines, borders. */
  frame: string;
  /**
   * The page furniture around the board: the header row, the progress track,
   * the action buttons, the rules panel.
   *
   * These are the tokens `game-frame.css` styles everything from, so without
   * them a carved stone board sits inside a default grey page and the skin
   * stops at the edge of the canvas. A complete board dresses the whole screen.
   */
  chrome: {
    page: string;
    surface: string;
    elevated: string;
    border: string;
    text: string;
    muted: string;
    /** Grid lines inside the board, which canvases read as `--game-grid`. */
    grid: string;
  };
};

export type Material = {
  id: string;
  name: string;
  description: string;
  swatch: readonly [string, string, string, string];
  /** Surface artwork and the matching status bar. Identical in every game. */
  extras: BoardExtras;
  light: MaterialShades;
  dark: MaterialShades;
};

const STONE_TEXTURE = "/skins/materials/stone.svg";
const MARBLE_TEXTURE = "/skins/materials/marble.svg";
const WOOD_TEXTURE = "/skins/materials/wood.svg";
const ARCADE_TEXTURE = "/skins/materials/arcade.svg";

/**
 * The four materials, defined once and shared by every game.
 *
 * The status bar colours are fixed rather than per-theme: the bar is made of the
 * material, and stone does not become pale because the page is in light mode.
 * Label and value colours are chosen to clear 4.5:1 against both panel bands.
 */
export const MATERIALS: readonly Material[] = [
  {
    id: "quarry",
    name: "Carved stone",
    description: "Chiselled tiles with mortar seams and lichen in the pits.",
    swatch: ["#c2b49a", "#8fa3a8", "#8fa088", "#a8a49d"],
    extras: {
      surface: {
        cellTexture: STONE_TEXTURE,
        bevel: "carved",
        edgeColor: "#4a443c",
        hud: {
          panel: "#4a463f",
          panelShade: "#3b3833",
          texture: STONE_TEXTURE,
          textureAlpha: 0.45,
          label: "#bcc4b4",
          value: "#f2efe6",
          divider: "#2a2723",
          rule: "#6b7f6a",
          bevel: { light: "#6d675d", dark: "#211f1c", width: 5 },
          labelTracking: 1,
        },
      },
    },
    light: {
      accent: "#6b7f6a",
      logoBg: "#e8e4dc",
      base: "#ded8cb",
      alt: "#cec7b7",
      deep: "#b8b0a0",
      contra: "#7c756a",
      frame: "#4a443c",
      chrome: {
        page: "#eae6dd",
        surface: "#f7f4ee",
        elevated: "#ece8de",
        border: "#cbc4b5",
        text: "#2c2a25",
        muted: "#5c574d",
        grid: "#4a443c",
      },
    },
    dark: {
      accent: "#8fae8c",
      logoBg: "#2b2a27",
      base: "#454139",
      alt: "#3a362f",
      deep: "#2e2b25",
      contra: "#9a8f7c",
      frame: "#23211d",
      chrome: {
        page: "#201e1a",
        surface: "#2a2723",
        elevated: "#34302a",
        border: "#454038",
        text: "#eceae3",
        muted: "#a8a194",
        grid: "#7a7364",
      },
    },
  },
  {
    id: "regalia",
    name: "Royal marble",
    description: "Veined marble with gold inlay and a polished sheen.",
    swatch: ["#e8dccb", "#c8b7cd", "#b9cbd4", "#d9c9a8"],
    extras: {
      surface: {
        cellTexture: MARBLE_TEXTURE,
        bevel: "raised",
        edgeColor: "#8c6417",
        hud: {
          panel: "#f3ead9",
          panelShade: "#e6d9c0",
          texture: MARBLE_TEXTURE,
          textureAlpha: 0.5,
          label: "#6f5529",
          value: "#3c2f1c",
          divider: "#c1912f",
          rule: "#c1912f",
          bevel: { light: "#fffaf0", dark: "#b9a887", width: 5 },
          labelTracking: 1,
        },
      },
    },
    light: {
      accent: "#8c6417",
      logoBg: "#f6efe0",
      base: "#e0dbd0",
      alt: "#d5cdbf",
      deep: "#c2b9a7",
      contra: "#837763",
      frame: "#8c6417",
      chrome: {
        page: "#f3ece0",
        surface: "#fbf7ef",
        elevated: "#f4ecdd",
        border: "#d9cdb6",
        text: "#2f2718",
        muted: "#67583d",
        grid: "#8c6417",
      },
    },
    dark: {
      accent: "#d8b25a",
      logoBg: "#2e2a24",
      base: "#4a453a",
      alt: "#3e3a31",
      deep: "#322f27",
      contra: "#a19479",
      frame: "#8c6417",
      chrome: {
        page: "#221e18",
        surface: "#2c2820",
        elevated: "#37322a",
        border: "#4a4437",
        text: "#f2ece0",
        muted: "#ada182",
        grid: "#b08a3a",
      },
    },
  },
  {
    id: "timber",
    name: "Chess club",
    description: "Oiled hardwood with brass edging and open grain.",
    swatch: ["#d9b47b", "#a9773f", "#8a5a33", "#6b4423"],
    extras: {
      surface: {
        cellTexture: WOOD_TEXTURE,
        bevel: "raised",
        edgeColor: "#4a3018",
        hud: {
          panel: "#5a3d21",
          panelShade: "#472f19",
          texture: WOOD_TEXTURE,
          textureAlpha: 0.5,
          label: "#d3aa6a",
          value: "#f6e7cf",
          divider: "#2c1c0c",
          rule: "#c9a227",
          bevel: { light: "#8a5f33", dark: "#241708", width: 5 },
        },
      },
    },
    light: {
      accent: "#8a5a33",
      logoBg: "#f2e6d5",
      base: "#ead6b4",
      alt: "#dcc59a",
      deep: "#c9ac7c",
      contra: "#956f3f",
      frame: "#4a3018",
      chrome: {
        page: "#efe2cd",
        surface: "#faf2e5",
        elevated: "#f0e3cf",
        border: "#d3bd9c",
        text: "#2e2113",
        muted: "#66502f",
        grid: "#4a3018",
      },
    },
    dark: {
      accent: "#c9a227",
      logoBg: "#2b241b",
      base: "#4a3a24",
      alt: "#3e301d",
      deep: "#322717",
      contra: "#ae834a",
      frame: "#2c1c0c",
      chrome: {
        page: "#1f1810",
        surface: "#292018",
        elevated: "#342920",
        border: "#46372a",
        text: "#f4e9da",
        muted: "#b09a80",
        grid: "#7a5f3a",
      },
    },
  },
  {
    id: "arcade",
    name: "Arcade",
    description: "Hard-bevelled pixel tiles and a cabinet marquee.",
    swatch: ["#f4c542", "#5ab4e0", "#6ac47a", "#e05a5a"],
    extras: {
      pixelated: true,
      surface: {
        cellTexture: ARCADE_TEXTURE,
        bevel: "raised",
        edgeColor: "#1d2233",
        hud: {
          panel: "#232a42",
          panelShade: "#1a2033",
          texture: ARCADE_TEXTURE,
          textureAlpha: 0.28,
          pixelated: true,
          label: "#8fa0ff",
          value: "#f4c542",
          divider: "#3a4fb8",
          rule: "#f4c542",
          bevel: { light: "#5f6ec4", dark: "#0c1020", width: 6 },
          valueFont: "Consolas, ui-monospace, monospace",
        },
      },
    },
    light: {
      accent: "#3a4fb8",
      logoBg: "#e4e8fb",
      base: "#e2e7fa",
      alt: "#d0d8f3",
      deep: "#b9c4ea",
      contra: "#717fae",
      frame: "#1d2233",
      chrome: {
        page: "#e6eafb",
        surface: "#f5f7fe",
        elevated: "#e9edfc",
        border: "#c3cbe9",
        text: "#1b2038",
        muted: "#4d5678",
        grid: "#1d2233",
      },
    },
    dark: {
      accent: "#7d8cff",
      logoBg: "#20233a",
      base: "#2b3350",
      alt: "#232a44",
      deep: "#1c2238",
      contra: "#6c7dc7",
      frame: "#101424",
      chrome: {
        page: "#141829",
        surface: "#1d2237",
        elevated: "#262c45",
        border: "#3a4260",
        text: "#e9edfb",
        muted: "#9aa4c9",
        grid: "#5f6ec4",
      },
    },
  },
];

function material(id: string): Material {
  const found = MATERIALS.find((entry) => entry.id === id);
  if (!found) {
    throw new Error(`Unknown material: ${id}`);
  }
  return found;
}

/**
 * Builds one game's version of a material board.
 *
 * Only the tokens that describe the *surface* are replaced; everything else —
 * the colours a game uses to mean something, like which symbol is which or
 * where a hazard is — is inherited from the base board untouched. That is the
 * line: a material may change what the board is made of, never what it says.
 */
function materialBoard(
  materialId: string,
  base: PaletteOption,
  tokens: (shades: MaterialShades) => ThemeTokens,
  overrides: Partial<Pick<PaletteOption, "id" | "name" | "description">> = {},
): PaletteOption {
  const chosen = material(materialId);
  const themed = (shades: MaterialShades): ThemeTokens => ({
    "--game-accent": shades.accent,
    "--game-logo-bg": shades.logoBg,
    // The frame tokens are game-agnostic, so every material board dresses its
    // page the same way without each game having to opt in.
    "--game-page": shades.chrome.page,
    "--game-surface": shades.chrome.surface,
    "--game-elevated": shades.chrome.elevated,
    "--game-border": shades.chrome.border,
    "--game-text": shades.chrome.text,
    "--game-muted": shades.chrome.muted,
    "--game-grid": shades.chrome.grid,
    ...tokens(shades),
  });

  return {
    id: overrides.id ?? chosen.id,
    name: overrides.name ?? chosen.name,
    description: overrides.description ?? chosen.description,
    swatch: chosen.swatch,
    extras: chosen.extras,
    light: { ...base.light, ...themed(chosen.light) },
    dark: { ...base.dark, ...themed(chosen.dark) },
  };
}


/**
 * The hand-written boards. Queens' four material boards are here rather than
 * generated because its ten region colours were tuned individually — a
 * mechanical recolour would blur regions into each other, which is the one
 * thing a Queens board must never do. Every other game's material boards are
 * derived below.
 */
const BASE_PALETTES: { [G in GameId]: readonly PaletteOption[] } = {
  queens: [
    /*
     * The four boards below carry a `surface`: neutral artwork drawn over the
     * region colours to give the board a material rather than only a hue. Their
     * region colours are picked to read as that material - quarried stone,
     * veined marble, oiled hardwood, a CRT palette - while keeping the ten
     * regions separable, which is the one thing a Queens board cannot trade
     * away. See `docs/skins.md`.
     */
    {
      id: "quarry",
      name: "Carved stone",
      description: "Chiselled tiles with mortar seams and lichen in the pits.",
      swatch: ["#9c8f7a", "#7d8b8e", "#8c7f74", "#6f7d6b"],
      extras: material("quarry").extras,
      light: {
        "--game-accent": "#6b7f6a",
        "--game-logo-bg": "#e8e4dc",
        "--region-1": "#c2b49a",
        "--region-2": "#8fa3a8",
        "--region-3": "#8fa088",
        "--region-4": "#bd9c82",
        "--region-5": "#8e97ad",
        "--region-6": "#ab8f96",
        "--region-7": "#b58b7a",
        "--region-8": "#9d95a6",
        "--region-9": "#87a49c",
        "--region-10": "#a8a49d",
      },
      dark: {
        "--game-accent": "#8fae8c",
        "--game-logo-bg": "#2b2a27",
        "--region-1": "#5f5644",
        "--region-2": "#41504f",
        "--region-3": "#455040",
        "--region-4": "#5e483a",
        "--region-5": "#414658",
        "--region-6": "#54424a",
        "--region-7": "#5b4238",
        "--region-8": "#4a4552",
        "--region-9": "#3d5049",
        "--region-10": "#4c4a46",
      },
    },
    {
      id: "regalia",
      name: "Royal marble",
      description: "Veined marble with gold inlay and a jewelled coronet.",
      swatch: ["#e8dccb", "#c8b7cd", "#b9cbd4", "#d9c9a8"],
      extras: material("regalia").extras,
      light: {
        "--game-accent": "#8c6417",
        "--game-logo-bg": "#f6efe0",
        "--region-1": "#e4d3a8",
        "--region-2": "#b6c8d8",
        "--region-3": "#aecdbd",
        "--region-4": "#e0bfa4",
        "--region-5": "#b2b6d6",
        "--region-6": "#d5b3c4",
        "--region-7": "#dfae9f",
        "--region-8": "#c3bad6",
        "--region-9": "#a9cbc6",
        "--region-10": "#d6d1c6",
      },
      dark: {
        "--game-accent": "#d8b25a",
        "--game-logo-bg": "#2e2a24",
        "--region-1": "#6b5c34",
        "--region-2": "#3f5064",
        "--region-3": "#3c5b4c",
        "--region-4": "#6b4f3c",
        "--region-5": "#454a68",
        "--region-6": "#5f3f52",
        "--region-7": "#6b4438",
        "--region-8": "#4e4864",
        "--region-9": "#3a5a55",
        "--region-10": "#565049",
      },
    },
    {
      id: "timber",
      name: "Chess club",
      description: "Oak and walnut with brass edging and a turned queen.",
      swatch: ["#c89a63", "#8a5a33", "#a9773f", "#6b4423"],
      extras: material("timber").extras,
      light: {
        "--game-accent": "#8a5a33",
        "--game-logo-bg": "#f2e6d5",
        "--region-1": "#d9b47b",
        "--region-2": "#a98f6f",
        "--region-3": "#9fae87",
        "--region-4": "#c99263",
        "--region-5": "#93967f",
        "--region-6": "#c08e77",
        "--region-7": "#b5764f",
        "--region-8": "#a58a86",
        "--region-9": "#8fa48c",
        "--region-10": "#bfae95",
      },
      dark: {
        "--game-accent": "#c9a227",
        "--game-logo-bg": "#2b241b",
        "--region-1": "#6b532e",
        "--region-2": "#544636",
        "--region-3": "#4c5540",
        "--region-4": "#66452a",
        "--region-5": "#484a3d",
        "--region-6": "#5e4238",
        "--region-7": "#5c3b25",
        "--region-8": "#514240",
        "--region-9": "#455043",
        "--region-10": "#5a5044",
      },
    },
    {
      id: "arcade",
      name: "Arcade",
      description: "Hard-bevelled pixel tiles and a chunky 16-bit crown.",
      swatch: ["#f4c542", "#5ab4e0", "#6ac47a", "#e05a5a"],
      extras: material("arcade").extras,
      light: {
        "--game-accent": "#3a4fb8",
        "--game-logo-bg": "#e4e8fb",
        "--region-1": "#f4c542",
        "--region-2": "#5ab4e0",
        "--region-3": "#6ac47a",
        "--region-4": "#f08a3c",
        "--region-5": "#6f7ee0",
        "--region-6": "#d977c0",
        "--region-7": "#e05a5a",
        "--region-8": "#a98ae8",
        "--region-9": "#4fc7b6",
        "--region-10": "#a8b0c4",
      },
      dark: {
        "--game-accent": "#7d8cff",
        "--game-logo-bg": "#20233a",
        "--region-1": "#8a6f18",
        "--region-2": "#245f7d",
        "--region-3": "#2c6b3c",
        "--region-4": "#8a4713",
        "--region-5": "#33408f",
        "--region-6": "#7a3868",
        "--region-7": "#8a2f2f",
        "--region-8": "#57408f",
        "--region-9": "#1f6b62",
        "--region-10": "#4b5364",
      },
    },
    {
      id: "studio",
      name: "Studio",
      description: "The original ten-region set tuned for maximum separation.",
      swatch: ["#efd35b", "#79b9df", "#75bf99", "#ca87b0"],
      light: {
        "--game-accent": "#7057d9",
        "--game-logo-bg": "#ece8fb",
        "--region-1": "#efd35b",
        "--region-2": "#79b9df",
        "--region-3": "#75bf99",
        "--region-4": "#eaa064",
        "--region-5": "#7897d0",
        "--region-6": "#ca87b0",
        "--region-7": "#df765e",
        "--region-8": "#a89bd0",
        "--region-9": "#87c5b9",
        "--region-10": "#b8bdc4",
      },
      dark: {
        "--game-accent": "#9d8cff",
        "--game-logo-bg": "#302d3e",
        "--region-1": "#70632e",
        "--region-2": "#3d677c",
        "--region-3": "#3e6c57",
        "--region-4": "#82593c",
        "--region-5": "#455d85",
        "--region-6": "#754d68",
        "--region-7": "#7b493c",
        "--region-8": "#5d5679",
        "--region-9": "#476e68",
        "--region-10": "#55585d",
      },
    },
    {
      id: "garden",
      name: "Rose garden",
      description: "Softened botanical regions with a rose-red accent.",
      swatch: ["#e6bf55", "#75a988", "#cf5b5c", "#bc788f"],
      light: {
        "--game-accent": "#b8414e",
        "--game-logo-bg": "#f5e8e9",
        "--region-1": "#e6bf55",
        "--region-2": "#75a988",
        "--region-3": "#a7c5b4",
        "--region-4": "#d9866d",
        "--region-5": "#7395b6",
        "--region-6": "#bc788f",
        "--region-7": "#cf5b5c",
        "--region-8": "#9186ad",
        "--region-9": "#72a49c",
        "--region-10": "#b3b7b9",
      },
      dark: {
        "--game-accent": "#e27c86",
        "--game-logo-bg": "#3c2d31",
        "--region-1": "#70612e",
        "--region-2": "#416653",
        "--region-3": "#526a60",
        "--region-4": "#7b523f",
        "--region-5": "#465e78",
        "--region-6": "#704c5a",
        "--region-7": "#7c4145",
        "--region-8": "#5c5574",
        "--region-9": "#456b65",
        "--region-10": "#565a5c",
      },
    },
    {
      id: "dusk",
      name: "Dusk",
      description: "Cool blues and violets for a low-contrast evening board.",
      swatch: ["#8fa8d8", "#7fb8c9", "#9fc4c0", "#b39ad4"],
      light: {
        "--game-accent": "#4f6bb0",
        "--game-logo-bg": "#e7ebf6",
        "--region-1": "#b9c6e4",
        "--region-2": "#8fa8d8",
        "--region-3": "#7fb8c9",
        "--region-4": "#9fc4c0",
        "--region-5": "#7f8fc4",
        "--region-6": "#b39ad4",
        "--region-7": "#c99ac0",
        "--region-8": "#8f9fd0",
        "--region-9": "#93c0d4",
        "--region-10": "#b6bcc8",
      },
      dark: {
        "--game-accent": "#8fa4e0",
        "--game-logo-bg": "#2b3044",
        "--region-1": "#4a5470",
        "--region-2": "#3f4f74",
        "--region-3": "#3a5a68",
        "--region-4": "#456260",
        "--region-5": "#414a78",
        "--region-6": "#584a74",
        "--region-7": "#684a63",
        "--region-8": "#454f74",
        "--region-9": "#3f5f70",
        "--region-10": "#4e525c",
      },
    },
    {
      id: "citrus",
      name: "Citrus",
      description: "Warm high-energy regions with strong hue separation.",
      swatch: ["#f2c14e", "#e8804f", "#7fbf6a", "#4fa8c4"],
      light: {
        "--game-accent": "#d9702f",
        "--game-logo-bg": "#fbeee0",
        "--region-1": "#f2c14e",
        "--region-2": "#4fa8c4",
        "--region-3": "#7fbf6a",
        "--region-4": "#e8804f",
        "--region-5": "#6f93c9",
        "--region-6": "#e08fa6",
        "--region-7": "#d95f4a",
        "--region-8": "#bfa25f",
        "--region-9": "#5fc0a8",
        "--region-10": "#c4c0b4",
      },
      dark: {
        "--game-accent": "#f0965a",
        "--game-logo-bg": "#3d3227",
        "--region-1": "#77642a",
        "--region-2": "#2f5b68",
        "--region-3": "#3f6a37",
        "--region-4": "#7a4830",
        "--region-5": "#3d5478",
        "--region-6": "#734a58",
        "--region-7": "#75382c",
        "--region-8": "#645636",
        "--region-9": "#33685c",
        "--region-10": "#5b584f",
      },
    },
  ],
  tango: [
    {
      id: "classic",
      name: "Classic",
      description: "The original gold and blue symbol contrast.",
      swatch: ["#d69e2e", "#3f7fca", "#f8f9fa", "#e1e4e7"],
      light: {
        "--game-accent": "#3478bd",
        "--game-logo-bg": "#eef1f4",
        "--symbol-1": "#d69e2e",
        "--symbol-1-soft": "#f5d476",
        "--symbol-0": "#3f7fca",
        "--symbol-0-soft": "#8db9e8",
        "--teal": "#2f8f83",
        "--board-cell": "#f8f9fa",
        "--board-given": "#e1e4e7",
      },
      dark: {
        "--game-accent": "#75a8dc",
        "--game-logo-bg": "#2e3238",
        "--symbol-1": "#e7b64e",
        "--symbol-1-soft": "#f2d587",
        "--symbol-0": "#75a8dc",
        "--symbol-0-soft": "#a3c7e8",
        "--teal": "#5bb8ae",
        "--board-cell": "#2d2d30",
        "--board-given": "#3c3c3f",
      },
    },
    {
      id: "elements",
      name: "Elements",
      description: "Fire orange against water blue.",
      swatch: ["#dc6538", "#247bc0", "#f7f8f9", "#dfe8e9"],
      light: {
        "--game-accent": "#2684a5",
        "--game-logo-bg": "#e6f1f4",
        "--symbol-1": "#dc6538",
        "--symbol-1-soft": "#f2a15f",
        "--symbol-0": "#247bc0",
        "--symbol-0-soft": "#75c8e9",
        "--teal": "#218c85",
        "--board-cell": "#f7f8f9",
        "--board-given": "#dfe8e9",
      },
      dark: {
        "--game-accent": "#62b5cf",
        "--game-logo-bg": "#28383d",
        "--symbol-1": "#ed875c",
        "--symbol-1-soft": "#f1b17f",
        "--symbol-0": "#6aaee0",
        "--symbol-0-soft": "#99d4ea",
        "--teal": "#5bb8ae",
        "--board-cell": "#2d2d30",
        "--board-given": "#3c3c3f",
      },
    },
    {
      id: "orchard",
      name: "Orchard",
      description: "Leaf green against a deep plum counterpart.",
      swatch: ["#4f9c68", "#8f5aa8", "#f6f8f5", "#e0e6de"],
      light: {
        "--game-accent": "#4f9c68",
        "--game-logo-bg": "#eaf3ec",
        "--symbol-1": "#4f9c68",
        "--symbol-1-soft": "#a5d2b1",
        "--symbol-0": "#8f5aa8",
        "--symbol-0-soft": "#c6a5d6",
        "--teal": "#2f8f83",
        "--board-cell": "#f6f8f5",
        "--board-given": "#e0e6de",
      },
      dark: {
        "--game-accent": "#72c48c",
        "--game-logo-bg": "#2b3830",
        "--symbol-1": "#72c48c",
        "--symbol-1-soft": "#a2d9b3",
        "--symbol-0": "#b183c9",
        "--symbol-0-soft": "#cfaee0",
        "--teal": "#5bb8ae",
        "--board-cell": "#2d2f2d",
        "--board-given": "#3b3e3b",
      },
    },
    {
      id: "slate",
      name: "Slate",
      description: "A neutral monochrome board that keeps symbols dominant.",
      swatch: ["#4a5560", "#9aa6b2", "#f4f5f6", "#e2e5e8"],
      light: {
        "--game-accent": "#556270",
        "--game-logo-bg": "#eceef0",
        "--symbol-1": "#3d4852",
        "--symbol-1-soft": "#a9b3bc",
        "--symbol-0": "#7d8b98",
        "--symbol-0-soft": "#ccd3d9",
        "--teal": "#4f8b84",
        "--board-cell": "#f4f5f6",
        "--board-given": "#e2e5e8",
      },
      dark: {
        "--game-accent": "#a7b4c0",
        "--game-logo-bg": "#31363b",
        "--symbol-1": "#dfe4e9",
        "--symbol-1-soft": "#9aa4ae",
        "--symbol-0": "#8b98a5",
        "--symbol-0-soft": "#5c666f",
        "--teal": "#5bb8ae",
        "--board-cell": "#2d2d30",
        "--board-given": "#3a3b3e",
      },
    },
  ],
  lights: [
    {
      id: "studio",
      name: "Studio",
      description: "The original neutral light board.",
      swatch: ["#eef1f3", "#e6eaed", "#2f8f83", "#edf5f3"],
      light: {
        "--game-accent": "#2f8f83",
        "--game-logo-bg": "#edf5f3",
        "--cell": "#eef1f3",
        "--cell-alt": "#e6eaed",
        "--route": "#2f8f83",
      },
      dark: {
        "--game-accent": "#57b8aa",
        "--game-logo-bg": "#293735",
        "--cell": "#2d2d30",
        "--cell-alt": "#29292c",
        "--route": "#57b8aa",
      },
    },
    {
      id: "walnut",
      name: "Walnut",
      description: "A warm timber panel behind every fixture.",
      swatch: ["#efe4d4", "#e5d7c2", "#9a6f3c", "#f3e9dc"],
      light: {
        "--game-accent": "#9a6f3c",
        "--game-logo-bg": "#f3e9dc",
        "--cell": "#efe4d4",
        "--cell-alt": "#e5d7c2",
        "--route": "#9a6f3c",
      },
      dark: {
        "--game-accent": "#c79a5e",
        "--game-logo-bg": "#352d23",
        "--cell": "#302a23",
        "--cell-alt": "#2a251f",
        "--route": "#c79a5e",
      },
    },
    {
      id: "midnight",
      name: "Midnight",
      description: "A deep blue room so lit cells carry all the brightness.",
      swatch: ["#dfe6f0", "#d4dcea", "#3f5f9c", "#e7ecf5"],
      light: {
        "--game-accent": "#3f5f9c",
        "--game-logo-bg": "#e7ecf5",
        "--cell": "#dfe6f0",
        "--cell-alt": "#d4dcea",
        "--route": "#3f5f9c",
      },
      dark: {
        "--game-accent": "#7f9fd8",
        "--game-logo-bg": "#242a3a",
        "--cell": "#242833",
        "--cell-alt": "#1f232d",
        "--route": "#7f9fd8",
      },
    },
  ],
  tracks: [
    {
      id: "transit",
      name: "Transit",
      description: "The original technical grey network.",
      swatch: ["#edf1f3", "#415a66", "#15967f", "#dfe6e9"],
      light: {
        "--game-accent": "#168b78",
        "--game-logo-bg": "#e9f4f1",
        "--cell": "#edf1f3",
        "--cell-alt": "#edf1f3",
        "--empty-cell": "#dfe6e9",
        "--track": "#415a66",
        "--track-channel": "#b8c4c9",
        "--track-node-center": "#7f98a3",
        "--track-node-mid": "#5e7782",
        "--track-node-rim": "#354b55",
        "--track-node-asset": "#415a66",
        "--flow": "#15967f",
        "--flow-bright": "#73d7c4",
        "--flow-glow": "rgba(21, 150, 127, 0.42)",
        "--flow-shadow": "#0b6658",
        "--start": "#3686ae",
        "--end": "#d85f50",
        "--lime": "#77a96b",
        "--gold": "#d3a44a",
        "--gold-soft": "#f1dda7",
      },
      dark: {
        "--game-accent": "#4ec9b0",
        "--game-logo-bg": "#293734",
        "--cell": "#2d2d30",
        "--cell-alt": "#2d2d30",
        "--empty-cell": "#35383b",
        "--track": "#66767d",
        "--track-channel": "#343d42",
        "--track-node-center": "#8c9ba1",
        "--track-node-mid": "#6f8087",
        "--track-node-rim": "#4c5b62",
        "--track-node-asset": "#7f929a",
        "--flow": "#4ec9b0",
        "--flow-bright": "#8be1d0",
        "--flow-glow": "rgba(78, 201, 176, 0.48)",
        "--flow-shadow": "#247a69",
        "--start": "#4ba7d1",
        "--end": "#e06f62",
        "--lime": "#8fbd83",
        "--gold": "#d8b15b",
        "--gold-soft": "#594c2d",
      },
    },
    {
      id: "coolant",
      name: "Coolant",
      description: "Chilled blue plumbing with a bright cyan flow.",
      swatch: ["#eaf2f5", "#3c5c69", "#1aa6d9", "#dce8ec"],
      light: {
        "--game-accent": "#168fbe",
        "--game-logo-bg": "#e4f3f8",
        "--cell": "#eaf2f5",
        "--cell-alt": "#eaf2f5",
        "--empty-cell": "#dce8ec",
        "--track": "#3c5c69",
        "--track-channel": "#b8d7e3",
        "--track-node-center": "#7f9fa9",
        "--track-node-mid": "#5e808c",
        "--track-node-rim": "#345460",
        "--track-node-asset": "#168fbe",
        "--flow": "#1aa6d9",
        "--flow-bright": "#88dbee",
        "--flow-glow": "rgba(26, 166, 217, 0.38)",
        "--flow-shadow": "#075d7f",
        "--start": "#367eac",
        "--end": "#d65d67",
        "--lime": "#77a96b",
        "--gold": "#d3a44a",
        "--gold-soft": "#f1dda7",
      },
      dark: {
        "--game-accent": "#45b9e6",
        "--game-logo-bg": "#283840",
        "--cell": "#2d2d30",
        "--cell-alt": "#2d2d30",
        "--empty-cell": "#333b40",
        "--track": "#617985",
        "--track-channel": "#263d48",
        "--track-node-center": "#8ca4ae",
        "--track-node-mid": "#6f8994",
        "--track-node-rim": "#4c626c",
        "--track-node-asset": "#54c8f2",
        "--flow": "#28b8ec",
        "--flow-bright": "#8cdef3",
        "--flow-glow": "rgba(40, 184, 236, 0.44)",
        "--flow-shadow": "#075f82",
        "--start": "#4ca6d1",
        "--end": "#e16b73",
        "--lime": "#8fbd83",
        "--gold": "#d8b15b",
        "--gold-soft": "#594c2d",
      },
    },
    {
      id: "refinery",
      name: "Refinery",
      description: "Machined steel and a dark warm ramp that reads as an oil slick.",
      swatch: ["#e8e4dc", "#8d8880", "#a68348", "#d6d1c6"],
      light: {
        "--game-accent": "#8a6a2f",
        "--game-logo-bg": "#eee8dc",
        "--cell": "#e8e4dc",
        "--cell-alt": "#e8e4dc",
        "--empty-cell": "#d6d1c6",
        "--game-grid": "#6d6659",
        "--track": "#4a4741",
        "--track-casing": "#8d8880",
        "--track-sheen": "#ddd8cf",
        "--track-channel": "#2f2c28",
        "--track-node-center": "#9c968c",
        "--track-node-mid": "#75706a",
        "--track-node-rim": "#413e39",
        "--track-node-asset": "#b9b3a8",
        "--flow": "#3a2f22",
        "--flow-bright": "#a68348",
        "--flow-glow": "rgba(24, 18, 12, 0.5)",
        "--flow-shadow": "#120e0a",
        "--flow-sheen-1": "#6f56c8",
        "--flow-sheen-2": "#2f8fbf",
        "--flow-sheen-3": "#33a883",
        "--flow-sheen-4": "#c7912f",
        "--flow-sheen-5": "#b34a6b",
        "--start": "#4f7f9c",
        "--end": "#b8503f",
        "--lime": "#8a9a5f",
        "--gold": "#c79a3f",
        "--gold-soft": "#ecd9a4",
      },
      dark: {
        "--game-accent": "#d2a85c",
        "--game-logo-bg": "#34302a",
        "--cell": "#2b2926",
        "--cell-alt": "#2b2926",
        "--empty-cell": "#232120",
        "--game-grid": "#5a544b",
        "--track": "#35322d",
        "--track-casing": "#6e6960",
        "--track-sheen": "#b8b1a5",
        "--track-channel": "#191715",
        "--track-node-center": "#8b857b",
        "--track-node-mid": "#6a655d",
        "--track-node-rim": "#3c3934",
        "--track-node-asset": "#a49d92",
        "--flow": "#40331f",
        "--flow-bright": "#c79a52",
        "--flow-glow": "rgba(0, 0, 0, 0.6)",
        "--flow-shadow": "#0a0806",
        "--flow-sheen-1": "#8b6fe8",
        "--flow-sheen-2": "#46a8d8",
        "--flow-sheen-3": "#46c49b",
        "--flow-sheen-4": "#e0a83c",
        "--flow-sheen-5": "#d05f83",
        "--start": "#5f95b4",
        "--end": "#d1604d",
        "--lime": "#a3b072",
        "--gold": "#d8b15b",
        "--gold-soft": "#594c2d",
      },
    },
    {
      id: "grid",
      name: "Grid",
      description: "Warm amber conduit built for the electric flow.",
      swatch: ["#f1f0ea", "#525861", "#e2ad17", "#e3e2db"],
      light: {
        "--game-accent": "#b88916",
        "--game-logo-bg": "#f7f0da",
        "--cell": "#f1f0ea",
        "--cell-alt": "#f1f0ea",
        "--empty-cell": "#e3e2db",
        "--track": "#525861",
        "--track-channel": "#c7c1a6",
        "--track-node-center": "#8b8f96",
        "--track-node-mid": "#6a6f78",
        "--track-node-rim": "#3f444c",
        "--track-node-asset": "#c89105",
        "--flow": "#e2ad17",
        "--flow-bright": "#fff3a3",
        "--flow-glow": "rgba(226, 173, 23, 0.64)",
        "--flow-shadow": "#8a6708",
        "--start": "#367eac",
        "--end": "#d75573",
        "--lime": "#8fa957",
        "--gold": "#d3a44a",
        "--gold-soft": "#f1dda7",
      },
      dark: {
        "--game-accent": "#e0b94d",
        "--game-logo-bg": "#3b382b",
        "--cell": "#2d2d30",
        "--cell-alt": "#2d2d30",
        "--empty-cell": "#383730",
        "--track": "#74716a",
        "--track-channel": "#3f3a28",
        "--track-node-center": "#98948b",
        "--track-node-mid": "#78746c",
        "--track-node-rim": "#524f49",
        "--track-node-asset": "#ffd34d",
        "--flow": "#e7b63a",
        "--flow-bright": "#fff1a0",
        "--flow-glow": "rgba(255, 211, 77, 0.72)",
        "--flow-shadow": "#8a6708",
        "--start": "#58a6cf",
        "--end": "#e06a88",
        "--lime": "#a3b072",
        "--gold": "#d8b15b",
        "--gold-soft": "#594c2d",
      },
    },
  ],
  zip: [
    {
      id: "current",
      name: "Current",
      description: "The original cool grey cells.",
      swatch: ["#f3f5f6", "#e9edef", "#2f82b7", "#d6a43f"],
      light: {
        "--game-accent": "#2f82b7",
        "--game-logo-bg": "#e8f1f7",
        "--cell": "#f3f5f6",
        "--cell-alt": "#e9edef",
        "--gold": "#d6a43f",
        "--gold-soft": "#f2dfaa",
      },
      dark: {
        "--game-accent": "#5aa9d7",
        "--game-logo-bg": "#29363e",
        "--cell": "#2d2d30",
        "--cell-alt": "#29292c",
        "--gold": "#d8b15b",
        "--gold-soft": "#594c2d",
      },
    },
    {
      id: "parchment",
      name: "Parchment",
      description: "Warm paper cells that sit under illustrated backgrounds.",
      swatch: ["#e6e2da", "#ddd9d1", "#b64d38", "#d4a13f"],
      light: {
        "--game-accent": "#b64d38",
        "--game-logo-bg": "#f3e8df",
        "--cell": "#e6e2da",
        "--cell-alt": "#ddd9d1",
        "--gold": "#d4a13f",
        "--gold-soft": "#efe0b9",
      },
      dark: {
        "--game-accent": "#df8067",
        "--game-logo-bg": "#3c302b",
        "--cell": "#30302f",
        "--cell-alt": "#2b2b2a",
        "--gold": "#dfbc6b",
        "--gold-soft": "#584c31",
      },
    },
    {
      id: "meadow",
      name: "Meadow",
      description: "Soft green cells with a fresh accent.",
      swatch: ["#eef3ea", "#e3ebdd", "#4f9c68", "#c9a24a"],
      light: {
        "--game-accent": "#4f9c68",
        "--game-logo-bg": "#e9f3ea",
        "--cell": "#eef3ea",
        "--cell-alt": "#e3ebdd",
        "--gold": "#c9a24a",
        "--gold-soft": "#eddfb4",
      },
      dark: {
        "--game-accent": "#72c48c",
        "--game-logo-bg": "#2a352c",
        "--cell": "#2c2f2c",
        "--cell-alt": "#282b28",
        "--gold": "#d8b15b",
        "--gold-soft": "#4f4a2d",
      },
    },
    {
      id: "graphite",
      name: "Graphite",
      description: "Near-neutral cells that let a bold arrow colour dominate.",
      swatch: ["#eeeff0", "#e3e5e6", "#5a6067", "#c2a259"],
      light: {
        "--game-accent": "#5a6067",
        "--game-logo-bg": "#eceef0",
        "--cell": "#eeeff0",
        "--cell-alt": "#e3e5e6",
        "--gold": "#c2a259",
        "--gold-soft": "#e9dcbc",
      },
      dark: {
        "--game-accent": "#a7b0b8",
        "--game-logo-bg": "#2f3338",
        "--cell": "#2b2c2e",
        "--cell-alt": "#262728",
        "--gold": "#d8b15b",
        "--gold-soft": "#4d4936",
      },
    },
  ],
  "mine-islands": [
    {
      id: "survey",
      name: "Survey",
      description: "The original neutral survey grid.",
      swatch: ["#dadddf", "#f6f7f8", "#377cc0", "#d4515d"],
      light: {
        "--game-accent": "#377cc0",
        "--game-logo-bg": "#e9f0f8",
        "--covered": "#dadddf",
        "--covered-hover": "#cfd4d8",
        "--revealed": "#f6f7f8",
        "--grid": "#aeb5bc",
        "--hazard": "#272b30",
        "--danger-soft": "#f4d7da",
        "--flag": "#d4515d",
        "--accent": "#377cc0",
        "--gold": "#d2a349",
        "--gold-soft": "#f1dfa9",
      },
      dark: {
        "--game-accent": "#6ca8e0",
        "--game-logo-bg": "#293644",
        "--covered": "#3a3d41",
        "--covered-hover": "#44484d",
        "--revealed": "#29292c",
        "--grid": "#1b1b1d",
        "--hazard": "#d4d4d4",
        "--danger-soft": "#543035",
        "--flag": "#ec7b84",
        "--accent": "#6ca8e0",
        "--gold": "#d8b15b",
        "--gold-soft": "#594c2d",
      },
    },
    {
      id: "xp-classic",
      name: "XP Classic",
      description: "Flat grey field with pixel clue tiles and the classic status bar.",
      swatch: ["#c0c0c0", "#c0c0c0", "#245edb", "#ff0000"],
      extras: {
        pixelated: true,
        clueTiles: [
          "/games/mine-islands/skins/xp-classic/open1.png",
          "/games/mine-islands/skins/xp-classic/open2.png",
          "/games/mine-islands/skins/xp-classic/open3.png",
          "/games/mine-islands/skins/xp-classic/open4.png",
          "/games/mine-islands/skins/xp-classic/open5.png",
          "/games/mine-islands/skins/xp-classic/open6.png",
          "/games/mine-islands/skins/xp-classic/open7.png",
          "/games/mine-islands/skins/xp-classic/open8.png",
        ],
        hud: {
          variant: "xp-classic",
          faces: {
            neutral: "/games/mine-islands/skins/xp-classic/smile.png",
            won: "/games/mine-islands/skins/xp-classic/win.png",
            lost: "/games/mine-islands/skins/xp-classic/dead.png",
            pressed: "/games/mine-islands/skins/xp-classic/ohh.png",
          },
          digits: [
            "/games/mine-islands/skins/xp-classic/digit0.png",
            "/games/mine-islands/skins/xp-classic/digit1.png",
            "/games/mine-islands/skins/xp-classic/digit2.png",
            "/games/mine-islands/skins/xp-classic/digit3.png",
            "/games/mine-islands/skins/xp-classic/digit4.png",
            "/games/mine-islands/skins/xp-classic/digit5.png",
            "/games/mine-islands/skins/xp-classic/digit6.png",
            "/games/mine-islands/skins/xp-classic/digit7.png",
            "/games/mine-islands/skins/xp-classic/digit8.png",
            "/games/mine-islands/skins/xp-classic/digit9.png",
          ],
          minus: "/games/mine-islands/skins/xp-classic/digit-.png",
        },
      },
      light: {
        "--game-accent": "#245edb",
        "--game-logo-bg": "#dfe6f3",
        "--covered": "#c0c0c0",
        "--covered-hover": "#c0c0c0",
        "--revealed": "#c0c0c0",
        "--grid": "#808080",
        "--hazard": "#000000",
        "--danger-soft": "#ff6b6b",
        "--flag": "#ff0000",
        "--accent": "#245edb",
        "--gold": "#d2a349",
        "--gold-soft": "#f1dfa9",
      },
      dark: {
        "--game-accent": "#5b8def",
        "--game-logo-bg": "#343b49",
        "--covered": "#c0c0c0",
        "--covered-hover": "#c0c0c0",
        "--revealed": "#c0c0c0",
        "--grid": "#808080",
        "--hazard": "#000000",
        "--danger-soft": "#ff6b6b",
        "--flag": "#ff0000",
        "--accent": "#5b8def",
        "--gold": "#d8b15b",
        "--gold-soft": "#594c2d",
      },
    },
    {
      id: "deep-sea",
      name: "Deep Sea",
      description: "Submerged teal shelves and a coral flag.",
      swatch: ["#9bc6c2", "#e9f4f2", "#147f7a", "#b85a4b"],
      light: {
        "--game-accent": "#147f7a",
        "--game-logo-bg": "#dcefed",
        "--covered": "#9bc6c2",
        "--covered-hover": "#88b7b3",
        "--revealed": "#e9f4f2",
        "--grid": "#497c78",
        "--hazard": "#263c3d",
        "--danger-soft": "#f2d0c8",
        "--flag": "#b85a4b",
        "--accent": "#147f7a",
        "--gold": "#d2a349",
        "--gold-soft": "#f1dfa9",
      },
      dark: {
        "--game-accent": "#4ec9c0",
        "--game-logo-bg": "#263c3b",
        "--covered": "#31504e",
        "--covered-hover": "#3b605d",
        "--revealed": "#202d2c",
        "--grid": "#142321",
        "--hazard": "#e0f0ed",
        "--danger-soft": "#583a35",
        "--flag": "#e58470",
        "--accent": "#4ec9c0",
        "--gold": "#d8b15b",
        "--gold-soft": "#594c2d",
      },
    },
    {
      id: "cosmic",
      name: "Cosmic",
      description: "Cool station plating with a magenta accent.",
      swatch: ["#c8ced7", "#f3f4f6", "#a94f72", "#267d89"],
      light: {
        "--game-accent": "#a94f72",
        "--game-logo-bg": "#f0e3e8",
        "--covered": "#c8ced7",
        "--covered-hover": "#b8c0cb",
        "--revealed": "#f3f4f6",
        "--grid": "#6f7885",
        "--hazard": "#2c2d33",
        "--danger-soft": "#f0d2dc",
        "--flag": "#267d89",
        "--accent": "#a94f72",
        "--gold": "#d2a349",
        "--gold-soft": "#f1dfa9",
      },
      dark: {
        "--game-accent": "#e47ba4",
        "--game-logo-bg": "#3b3037",
        "--covered": "#3b3c43",
        "--covered-hover": "#484a52",
        "--revealed": "#242428",
        "--grid": "#151519",
        "--hazard": "#ededf0",
        "--danger-soft": "#593340",
        "--flag": "#6cc3cf",
        "--accent": "#e47ba4",
        "--gold": "#d8b15b",
        "--gold-soft": "#594c2d",
      },
    },
  ],
  "mini-chess": [
    {
      id: "club",
      name: "Club",
      description: "The original tournament green and bone board.",
      swatch: ["#d9d3c3", "#6f8f82", "#3a4744", "#b38932"],
      light: {
        "--game-accent": "#9a762c",
        "--game-logo-bg": "#ece9df",
        "--board-light": "#d9d3c3",
        "--board-dark": "#6f8f82",
        "--board-frame": "#3a4744",
        "--accent": "#b38932",
        "--accent-soft": "#e6d8b8",
      },
      dark: {
        "--game-accent": "#d0ad5d",
        "--game-logo-bg": "#39352c",
        "--board-light": "#b7b09f",
        "--board-dark": "#526f64",
        "--board-frame": "#171c1b",
        "--accent": "#d0ad5d",
        "--accent-soft": "#55482d",
      },
    },
    {
      id: "walnut",
      name: "Walnut",
      description: "Traditional timber squares with a deep brown frame.",
      swatch: ["#e8d3b0", "#a0693f", "#4a3324", "#b8823a"],
      light: {
        "--game-accent": "#8f5f2e",
        "--game-logo-bg": "#f2e6d5",
        "--board-light": "#e8d3b0",
        "--board-dark": "#a0693f",
        "--board-frame": "#4a3324",
        "--accent": "#b8823a",
        "--accent-soft": "#eddcb9",
      },
      dark: {
        "--game-accent": "#cf9d5c",
        "--game-logo-bg": "#382d22",
        "--board-light": "#c2ac8b",
        "--board-dark": "#7d4f2e",
        "--board-frame": "#1d150f",
        "--accent": "#cf9d5c",
        "--accent-soft": "#55402a",
      },
    },
    {
      id: "marble",
      name: "Marble",
      description: "Cool stone squares with a quiet blue-grey contrast.",
      swatch: ["#eceef0", "#8b99a6", "#39424a", "#5f7f9c"],
      light: {
        "--game-accent": "#5f7f9c",
        "--game-logo-bg": "#e9edf1",
        "--board-light": "#eceef0",
        "--board-dark": "#8b99a6",
        "--board-frame": "#39424a",
        "--accent": "#5f7f9c",
        "--accent-soft": "#cfdce7",
      },
      dark: {
        "--game-accent": "#8fadc6",
        "--game-logo-bg": "#2c333a",
        "--board-light": "#b3bac1",
        "--board-dark": "#5d6b78",
        "--board-frame": "#16191d",
        "--accent": "#8fadc6",
        "--accent-soft": "#39485a",
      },
    },
    {
      id: "midnight",
      name: "Midnight",
      description: "High-contrast indigo squares for a night board.",
      swatch: ["#c9cfe0", "#4a5580", "#1e2438", "#8f9fd8"],
      light: {
        "--game-accent": "#4f5c8c",
        "--game-logo-bg": "#e4e7f1",
        "--board-light": "#c9cfe0",
        "--board-dark": "#4a5580",
        "--board-frame": "#1e2438",
        "--accent": "#5c6aa0",
        "--accent-soft": "#ced5ea",
      },
      dark: {
        "--game-accent": "#8f9fd8",
        "--game-logo-bg": "#282d40",
        "--board-light": "#9aa2bd",
        "--board-dark": "#3b4467",
        "--board-frame": "#101322",
        "--accent": "#8f9fd8",
        "--accent-soft": "#333a57",
      },
    },
  ],
};

/* ------------------------------------------------- material boards per game -- */

/**
 * Which of a game's tokens describe the board *surface*, and which describe
 * what the board is *saying*.
 *
 * Only the first kind is replaced by a material. A game's meaningful colours —
 * which symbol is which in Tango, where a hazard is in Mine Islands, the route
 * in Zip — are inherited from the base board untouched, because a material may
 * change what a board is made of but never what it tells you.
 */
const SURFACE_TOKENS: Partial<{
  [G in GameId]: (shades: MaterialShades) => ThemeTokens;
}> = {
  tango: (s) => ({ "--board-cell": s.base, "--board-given": s.deep }),
  lights: (s) => ({ "--cell": s.base, "--cell-alt": s.alt }),
  tracks: (s) => ({ "--cell": s.base, "--cell-alt": s.alt, "--empty-cell": s.deep }),
  zip: (s) => ({ "--cell": s.base, "--cell-alt": s.alt }),
  "mine-islands": (s) => ({
    "--covered": s.base,
    "--covered-hover": s.alt,
    "--revealed": s.deep,
    "--grid": s.frame,
  }),
  // Chess needs the two square colours far apart, so it takes the widest pair a
  // material offers rather than the adjacent one the grid games use.
  "mini-chess": (s) => ({
    "--board-light": s.base,
    "--board-dark": s.contra,
    "--board-frame": s.frame,
  }),
};

/**
 * Rebuilds one game's board list with materials folded in.
 *
 * `upgrade` re-cuts an existing board in the given material instead of adding a
 * near-duplicate beside it — the Lights and MiniChess walnut boards were
 * already trying to be wood, so they become wood rather than gaining a second
 * wooden neighbour. Whatever is not upgraded is prepended as a new board.
 */
function withMaterials(
  gameId: Exclude<GameId, "queens">,
  upgrade: Readonly<Record<string, string>> = {},
): readonly PaletteOption[] {
  const tokens = SURFACE_TOKENS[gameId];
  if (!tokens) {
    return BASE_PALETTES[gameId];
  }

  const upgradedIds = new Set(Object.values(upgrade));
  const existing = BASE_PALETTES[gameId].map((board) => {
    const materialId = upgrade[board.id];
    return materialId
      ? materialBoard(materialId, board, tokens, {
          id: board.id,
          name: board.name,
          description: board.description,
        })
      : board;
  });

  const added = MATERIALS.filter((entry) => !upgradedIds.has(entry.id)).map((entry) =>
    materialBoard(entry.id, BASE_PALETTES[gameId][0], tokens),
  );

  return [...added, ...existing];
}

export const GAME_PALETTES: { [G in GameId]: readonly PaletteOption[] } = {
  // Queens writes its own region colours, but still takes the shared accent and
  // page chrome, so its material boards dress the screen like everyone else's.
  // The empty token map is the point: nothing about the board itself is
  // replaced, only the furniture around it.
  queens: BASE_PALETTES.queens.map((board) =>
    MATERIALS.some((entry) => entry.id === board.id)
      ? materialBoard(board.id, board, () => ({}), {
          id: board.id,
          name: board.name,
          description: board.description,
        })
      : board,
  ),
  tango: withMaterials("tango"),
  lights: withMaterials("lights", { walnut: "timber" }),
  tracks: withMaterials("tracks"),
  zip: withMaterials("zip"),
  "mine-islands": withMaterials("mine-islands"),
  "mini-chess": withMaterials("mini-chess", { walnut: "timber", marble: "regalia" }),
};

/**
 * Tints exist only for the games whose part list separates a single accent from
 * the surrounding palette. Games without an entry simply have no tint part.
 */
export const GAME_TINTS: Partial<{ [G in GameId]: readonly TintOption[] }> = {
  lights: [
    {
      id: "amber",
      name: "Amber",
      description: "The original warm filament glow.",
      swatch: ["#e8b83f", "#cbd2d7"],
      light: { "--glow": "#e8b83f", "--glow-soft": "#f6dda0", "--light-off": "#cbd2d7" },
      dark: { "--glow": "#edc258", "--glow-soft": "#f1dc9a", "--light-off": "#52565b" },
    },
    {
      id: "mint",
      name: "Mint",
      description: "A cool green-white light.",
      swatch: ["#4ec9a8", "#cbd6d4"],
      light: { "--glow": "#3fb894", "--glow-soft": "#a9e6d4", "--light-off": "#cbd6d4" },
      dark: { "--glow": "#4ec9a8", "--glow-soft": "#9de0cb", "--light-off": "#4e5856" },
    },
    {
      id: "rose",
      name: "Rose",
      description: "A warm pink filament.",
      swatch: ["#e0698c", "#d6ccd0"],
      light: { "--glow": "#d9557c", "--glow-soft": "#f3b6c8", "--light-off": "#d6ccd0" },
      dark: { "--glow": "#e0698c", "--glow-soft": "#f0adc2", "--light-off": "#5a4f53" },
    },
    {
      id: "arctic",
      name: "Arctic",
      description: "A cold blue-white light.",
      swatch: ["#5aa9e6", "#c9d1d8"],
      light: { "--glow": "#4a9ada", "--glow-soft": "#aad4f2", "--light-off": "#c9d1d8" },
      dark: { "--glow": "#5aa9e6", "--glow-soft": "#a4d3f2", "--light-off": "#4d545c" },
    },
  ],
  zip: [
    {
      id: "cerulean",
      name: "Cerulean",
      description: "The original blue route.",
      swatch: ["#2f82b7", "#c7dfed"],
      light: {
        "--route": "#2f82b7",
        "--route-dark": "#23658e",
        "--route-soft": "#c7dfed",
        "--route-visited": "#dceaf2",
      },
      dark: {
        "--route": "#5aa9d7",
        "--route-dark": "#7ab9dc",
        "--route-soft": "#314957",
        "--route-visited": "#30414b",
      },
    },
    {
      id: "ember",
      name: "Ember",
      description: "A warm terracotta route.",
      swatch: ["#c65b3e", "#e7c6a7"],
      light: {
        "--route": "#c65b3e",
        "--route-dark": "#7d372a",
        "--route-soft": "#e7c6a7",
        "--route-visited": "#dcd2c2",
      },
      dark: {
        "--route": "#df8067",
        "--route-dark": "#f0a28b",
        "--route-soft": "#564039",
        "--route-visited": "#3f3934",
      },
    },
    {
      id: "moss",
      name: "Moss",
      description: "A deep green route.",
      swatch: ["#4f9c68", "#c4dfc9"],
      light: {
        "--route": "#3f8b58",
        "--route-dark": "#2c663f",
        "--route-soft": "#c4dfc9",
        "--route-visited": "#d9e9dc",
      },
      dark: {
        "--route": "#6fc48a",
        "--route-dark": "#8ed4a3",
        "--route-soft": "#31473a",
        "--route-visited": "#2f3f35",
      },
    },
    {
      id: "violet",
      name: "Violet",
      description: "A saturated purple route.",
      swatch: ["#7f5ac4", "#d5c8ee"],
      light: {
        "--route": "#7057c4",
        "--route-dark": "#4f3b93",
        "--route-soft": "#d5c8ee",
        "--route-visited": "#e2dbf3",
      },
      dark: {
        "--route": "#a48ce0",
        "--route-dark": "#bda9ec",
        "--route-soft": "#3c3552",
        "--route-visited": "#363048",
      },
    },
  ],
};

export function gameTints(gameId: GameId): readonly TintOption[] {
  return GAME_TINTS[gameId] ?? [];
}

function block(selector: string, tokens: ThemeTokens): string {
  const body = Object.entries(tokens)
    .map(([name, value]) => `${name}:${value}`)
    .join(";");
  return body ? `${selector}{${body}}` : "";
}

/**
 * Repeated attribute selectors buy specificity without `!important`, which is
 * what keeps the layers ordered predictably:
 *
 *   base game tokens  <  palette light  <  palette dark  <  tint light  <  tint dark
 *
 * A palette therefore declares only the tokens it actually changes, and a tint
 * always wins over the palette underneath it. The selectors deliberately match
 * on the attribute alone rather than on `.suite-shell`, so the config rack can
 * carry the same attributes and preview the real board colours.
 */
const PALETTE_SELECTOR = "[data-palette][data-palette][data-palette]";
const TINT_SELECTOR = "[data-tint][data-tint][data-tint][data-tint][data-tint]";

export function paletteToken(gameId: GameId, paletteId: string): string {
  return `${gameId}:${paletteId}`;
}

export function paletteStyleSheet(): string {
  const rules: string[] = [];

  for (const [gameId, palettes] of Object.entries(GAME_PALETTES) as Array<
    [GameId, readonly PaletteOption[]]
  >) {
    for (const palette of palettes) {
      const attribute = `[data-palette="${paletteToken(gameId, palette.id)}"]`;
      rules.push(block(`${PALETTE_SELECTOR}${attribute}`, palette.light));
      rules.push(block(`[data-theme="dark"] ${PALETTE_SELECTOR}${attribute}`, palette.dark));
    }
  }

  for (const [gameId, tints] of Object.entries(GAME_TINTS) as Array<
    [GameId, readonly TintOption[]]
  >) {
    for (const tint of tints) {
      const attribute = `[data-tint="${paletteToken(gameId, tint.id)}"]`;
      rules.push(block(`${TINT_SELECTOR}${attribute}`, tint.light));
      rules.push(block(`[data-theme="dark"] ${TINT_SELECTOR}${attribute}`, tint.dark));
    }
  }

  return rules.filter(Boolean).join("\n");
}

export function findPalette(gameId: GameId, paletteId: string): PaletteOption | undefined {
  return GAME_PALETTES[gameId].find(
    (palette) => palette.id === paletteId,
  );
}

export function findTint(gameId: GameId, tintId: string): TintOption | undefined {
  return gameTints(gameId).find((tint) => tint.id === tintId);
}
