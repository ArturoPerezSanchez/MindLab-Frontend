import { memo, useMemo } from "react";
import { paletteToken, resolveGameSkin, type GameCustomization } from "@/features/skins/skins";
import { positionKey } from "@/games/queens/game";
import type { Placement } from "./protocol";

/**
 * A read-only Queens board drawn in *its owner's* skin, not the viewer's
 * (requirement 10). Used for the side rail tiles and for the main stage while
 * spectating.
 *
 * Deliberately plain DOM rather than the PixiJS renderer the player's own board
 * uses: up to eight of these are on screen at once, they never take input, and
 * they redraw on every `progress` broadcast. A grid of divs costs nothing to
 * mount and nothing to update, where eight WebGL contexts would cost both.
 *
 * The colours come from the same generated palette stylesheet the real board
 * uses, keyed off `data-palette`, so a board here and the same board in play are
 * the same board.
 */
export const PlayerBoard = memo(function PlayerBoard({
  board,
  placements,
  skin,
  variant = "tile",
  dimmed = false,
  label,
}: {
  board: number[][];
  placements: readonly Placement[];
  skin: GameCustomization;
  variant?: "tile" | "stage";
  /** True for a player who is out, so their board reads as inactive. */
  dimmed?: boolean;
  label: string;
}) {
  const resolved = useMemo(() => resolveGameSkin("queens", skin), [skin]);
  const size = board.length;
  const queens = useMemo(
    () => new Set(placements.map(([row, col]) => positionKey(row, col))),
    [placements],
  );

  return (
    <div
      className={`mp-board mp-board-${variant}`}
      data-palette={paletteToken("queens", resolved.palette.id)}
      data-pixelated={resolved.pixelated ? "true" : undefined}
      data-dimmed={dimmed ? "true" : undefined}
      style={{ "--mp-board-size": size } as React.CSSProperties}
      role="img"
      aria-label={label}
    >
      {board.map((rowValues, row) =>
        rowValues.map((region, col) => {
          const key = positionKey(row, col);
          return (
            <span
              className="mp-board-cell"
              key={key}
              style={{
                // Material over colour, exactly as the PixiJS board layers it,
                // so a spectated board looks like the board its owner is
                // playing rather than a flat approximation of it.
                backgroundColor: `var(--region-${(Math.abs(region) % 10) + 1})`,
                backgroundImage: resolved.assets.surface
                  ? `url("${resolved.assets.surface.cellTexture}")`
                  : undefined,
                backgroundSize: "100% 100%",
                // Region outlines, drawn the same way the real board draws them:
                // a heavier edge wherever the neighbouring cell is another region.
                borderTopWidth: row === 0 || board[row - 1][col] !== region ? 2 : 1,
                borderLeftWidth: col === 0 || board[row][col - 1] !== region ? 2 : 1,
                borderRightWidth: col === size - 1 ? 2 : 0,
                borderBottomWidth: row === size - 1 ? 2 : 0,
                borderColor: resolved.assets.surface?.edgeColor,
              }}
            >
              {queens.has(key) ? (
                <img className="mp-board-piece" src={resolved.assets.marker} alt="" aria-hidden="true" />
              ) : null}
            </span>
          );
        }),
      )}
    </div>
  );
});
