import type { Container, Texture } from "pixi.js";
import type { BoardSurface } from "@/features/skins/types";
import { addLine, addSprite } from "./drawing";

/**
 * Draws a board's material over one cell.
 *
 * Every game calls this immediately after filling a cell with its own colour,
 * because that is the whole design: the texture is neutral artwork — black and
 * white at low alpha — laid *over* the fill rather than replacing it. The
 * colour underneath keeps saying whatever it says in that game (which region,
 * which parity, covered or revealed), and the texture only supplies the
 * material. One stone tile therefore serves seven games without any of them
 * losing the meaning carried by their own palette.
 *
 * Kept here rather than in each canvas so a fifth material is a data change,
 * not six edits.
 */
export function drawCellSurface(
  root: Container,
  textures: ReadonlyMap<string, Texture>,
  surface: BoardSurface | undefined,
  x: number,
  y: number,
  cellWidth: number,
  cellHeight: number,
): void {
  if (!surface) {
    return;
  }

  addSprite(
    root,
    textures.get(surface.cellTexture),
    x + cellWidth / 2,
    y + cellHeight / 2,
    cellWidth,
    cellHeight,
  );

  if (!surface.bevel) {
    return;
  }

  // `raised` lights the top-left and shades the bottom-right, so cells sit on
  // the surface; `carved` inverts it, so they read as cut into it.
  const lit = surface.bevel === "raised" ? "#ffffff" : "#000000";
  const shade = surface.bevel === "raised" ? "#000000" : "#ffffff";
  const inset = Math.max(1.5, cellWidth * 0.045);

  addLine(root, [x, y + cellHeight, x, y, x + cellWidth, y], lit, inset, 0.28);
  addLine(
    root,
    [x + cellWidth, y, x + cellWidth, y + cellHeight, x, y + cellHeight],
    shade,
    inset,
    0.24,
  );
}

/** Adds the material texture to a canvas's asset list when a board carries one. */
export function withSurfaceAssets(
  assetUrls: readonly string[],
  surface: BoardSurface | undefined,
): string[] {
  return surface ? [...assetUrls, surface.cellTexture] : [...assetUrls];
}
