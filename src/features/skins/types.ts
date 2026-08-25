import type { GameId } from "@/shared/gameOptions";

export type SkinUnlock =
  | { type: "starter" }
  | { type: "achievement"; achievementId: string };

export type SkinPreview = {
  sources: readonly [string, ...string[]];
  presentation: "contain" | "pair" | "cover";
};

export type SkinSymbolAsset = {
  src: string;
  label: string;
};

export type FlowParticle = {
  /** Omit for materials that draw their own flow and need no sprite. */
  src?: string;
  material?: "liquid" | "energy" | "oil";
  size: number;
  spacing: number;
  speed: number;
  opacity?: number;
  drift?: number;
  flicker?: number;
  rotateToPath?: boolean;
  additive?: boolean;
  pulseOpacity?: number;
};

export type ChessPieceSource = {
  root: string;
  extension: "svg" | "png" | "webp";
};

export type MineHud = {
  variant: "xp-classic";
  faces: {
    neutral: string;
    won: string;
    lost: string;
    pressed: string;
  };
  digits: readonly string[];
  minus: string;
};

/**
 * The status bar as the board's own furniture.
 *
 * A detailed board is not just its cells: XP Classic replaces the whole bar,
 * and a carved stone board that keeps a flat white panel above it looks like
 * two different products stacked. This describes the bar declaratively so one
 * draw routine serves every themed board, rather than each one arriving with a
 * bespoke `variant` and its own function.
 */
export type BoardHudStyle = {
  /** Panel fill. */
  panel: string;
  /** Second band under the panel fill, for a lit-from-above plate. */
  panelShade?: string;
  /** The board's own cell texture, reused across the panel to match it. */
  texture?: string;
  /** Opacity for that texture over the panel. Defaults to a light wash. */
  textureAlpha?: number;
  label: string;
  value: string;
  divider: string;
  /** The rule along the bottom edge, where the panel meets the board. */
  rule: string;
  /** Raised or sunken plate edges, drawn XP-style. */
  bevel?: { light: string; dark: string; width: number };
  /** Overrides the typeface, e.g. a monospace readout. */
  valueFont?: string;
  /** Keeps the panel texture blocky instead of smoothed. */
  pixelated?: boolean;
  /** Small caps and wide tracking suit engraved plates; pixel bars do not. */
  labelTracking?: number;
};

/**
 * Material a board lays over its region colours.
 *
 * The texture is deliberately neutral artwork - black and white at low alpha -
 * drawn *over* the region fill rather than instead of it. That is what lets one
 * stone or marble tile serve all ten regions: the colour underneath still
 * identifies the region, and the texture only supplies the material.
 */
export type BoardSurface = {
  /** Drawn over every cell at cell size. Shading only, no hue of its own. */
  cellTexture: string;
  /**
   * Cell edge treatment. `raised` lights the top-left and shades the
   * bottom-right; `carved` does the reverse, so cells read as cut into the
   * surface rather than sitting on it.
   */
  bevel?: "raised" | "carved";
  /** Overrides the heavy region outline colour, e.g. mortar or brass. */
  edgeColor?: string;
  /** The matching status bar. Without it the board stops at the grid. */
  hud?: BoardHudStyle;
};

/**
 * Anything the board part contributes beyond colour tokens. A board is not only
 * a palette: XP Classic also swaps the pixel clue tiles and the whole status
 * bar, and a detailed board carries its own material. Keeping these here is what
 * lets a board own the chrome instead of the sprite slots owning it.
 */
export type BoardExtras = {
  /** Pixel art must not be smoothed by the canvas. */
  pixelated?: boolean;
  /** Tiled or stretched surface image drawn behind the cells. */
  texture?: string;
  /** Per-cell material, for boards that are more than a set of colours. */
  surface?: BoardSurface;
  /** Replacement status bar. Mine Islands is the only consumer today. */
  hud?: MineHud;
  /** Numbered cell faces, index 0 being the "1" tile. */
  clueTiles?: readonly string[];
};

/**
 * The resolved shape handed to renderers. It is deliberately unchanged in
 * spirit from the previous whole-skin model: components still consume stable
 * roles and never learn that a role now comes from an independently chosen
 * part.
 */
export type GameSkinAssetMap = {
  queens: {
    marker: string;
  };
  tango: {
    symbols: readonly [SkinSymbolAsset, SkinSymbolAsset];
  };
  lights: {
    bulbs: readonly [string, string];
  };
  tracks: {
    node: string;
    /**
     * `cylindrical` shades the pipe casing with stacked offset strokes so it
     * reads as a round tube lit from the upper left, instead of a flat band.
     */
    pipeStyle?: "flat" | "cylindrical";
    flowParticle?: FlowParticle;
  };
  zip: {
    revealImage?: string;
  };
  "mine-islands": {
    hazard: string;
    flag: string;
    death?: string;
    misflagged?: string;
    clueTiles?: readonly string[];
    hud?: MineHud;
  };
  "mini-chess": {
    /** One source per piece type so sets can be mixed piece by piece. */
    pieces: Readonly<Record<"p" | "n" | "b" | "r" | "q" | "k", ChessPieceSource>>;
  };
};

/**
 * The value each asset part contributes. A part is a slice of the resolved
 * asset map, so the resolver for a game is a plain merge.
 */
export type GamePartValues = {
  queens: {
    marker: { marker: string };
  };
  tango: {
    moon: { symbol: SkinSymbolAsset };
    sun: { symbol: SkinSymbolAsset };
  };
  lights: {
    bulb: { bulbs: readonly [string, string] };
  };
  tracks: {
    pipe: { node: string; pipeStyle?: "flat" | "cylindrical" };
    liquid: { flowParticle?: FlowParticle };
  };
  zip: {
    background: { revealImage?: string };
  };
  "mine-islands": {
    /**
     * The detonated mine and the struck-through mine are variants of the mine
     * you picked, so they travel with it rather than being separate slots. The
     * flag is chosen independently.
     */
    mine: { hazard: string; death?: string; misflagged?: string };
    flag: { flag: string };
  };
  "mini-chess": {
    pawn: ChessPieceSource;
    knight: ChessPieceSource;
    bishop: ChessPieceSource;
    rook: ChessPieceSource;
    queen: ChessPieceSource;
    king: ChessPieceSource;
  };
};

export type PartId<G extends GameId = GameId> = keyof GamePartValues[G] & string;

export type PartOption<V> = {
  id: string;
  name: string;
  description: string;
  preview: SkinPreview;
  unlock: SkinUnlock;
  /**
   * Marks pixel-art sources so the canvas can disable smoothing. Set on the
   * option rather than the palette because it is a property of the artwork.
   */
  pixelated?: boolean;
  value: V;
};

export type AssetPart<V> = {
  /** Player-facing name of the slot, e.g. "Queen asset". */
  label: string;
  hint: string;
  options: readonly PartOption<V>[];
};

export type AssetParts<G extends GameId> = {
  [K in keyof GamePartValues[G]]: AssetPart<GamePartValues[G][K]>;
};

export type PartSelections = Readonly<Record<string, string>>;

/** Reserved part ids that every game understands. */
export const PALETTE_PART = "palette";
export const TINT_PART = "tint";
