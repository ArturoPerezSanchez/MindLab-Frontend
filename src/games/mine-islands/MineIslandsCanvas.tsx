import { useCallback, useMemo } from "react";
import { Graphics } from "pixi.js";
import type { GameSkinAssetMap } from "@/features/skins/skins";
import {
  CanvasBoard,
  type CanvasBoardAnimationFrame,
  type CanvasBoardHud,
  type CanvasBoardPointer,
  type CanvasCellPosition,
} from "@/shared/canvas/CanvasBoard";
import { drawCellSurface, withSurfaceAssets } from "@/shared/canvas/surface";
import type { BoardSurface } from "@/features/skins/skins";
import { addLabel, addLine, addRect, addSprite, cssVar } from "@/shared/canvas/drawing";
import { drawMinesCelebration, type CellRef } from "@/shared/canvas/winCelebration";
import { MINE, positionKey } from "./game";
import type { Position, Puzzle, VisibilityBoard } from "./types";

const CLUE_COLORS = ["#000000", "#2f73bf", "#23845f", "#c4544c", "#8359a6", "#b5792e", "#267a80", "#36393d", "#6f7479"];

type MineIslandsCanvasProps = {
  /** Material laid over the cell colours by the chosen board. */
  surface?: BoardSurface;
  puzzle: Puzzle;
  visibility: VisibilityBoard;
  assets: GameSkinAssetMap["mine-islands"];
  lost: boolean;
  pressedMine: Position | null;
  /** 0..1 while the solved board celebrates, null when idle. */
  celebration: number | null;
  disabled: boolean;
  hud: CanvasBoardHud;
  onActivate: (position: CanvasCellPosition) => void;
  onContextMenu: (position: CanvasCellPosition) => void;
  onPointerDown: (pointer: CanvasBoardPointer) => void;
  onPointerUp: () => void;
};

export function MineIslandsCanvas({
  surface,
  puzzle,
  visibility,
  assets,
  lost,
  pressedMine,
  celebration,
  disabled,
  hud,
  onActivate,
  onContextMenu,
  onPointerDown,
  onPointerUp,
}: MineIslandsCanvasProps) {
  const classic = Boolean(assets.clueTiles?.length);
  const cells = useMemo(
    () =>
      puzzle.values.flatMap((rowValues, row) =>
        rowValues.map((value, col) => {
          const status = visibility[row][col];
          const incorrectlyFlagged = lost && status === "flagged" && value !== MINE;
          const revealedMine = lost && value === MINE && (!classic || status !== "flagged");
          const revealed = status === "revealed" || revealedMine || incorrectlyFlagged;
          const flagged = status === "flagged" && !revealed;
          const label = incorrectlyFlagged
            ? "incorrectly flagged"
            : revealed
            ? value === MINE
              ? "hazard"
              : value === 0
                ? "clear"
                : `${value} touching hazards`
            : flagged
              ? "flagged"
              : "hidden";
          return {
            key: positionKey([row, col]),
            row,
            col,
            disabled,
            label: `Row ${row + 1}, column ${col + 1}: ${label}`,
          };
        }),
      ),
    [classic, disabled, lost, puzzle.values, visibility],
  );

  const draw = useCallback(
    ({ root, textures, host, cellWidth, cellHeight }: Parameters<React.ComponentProps<typeof CanvasBoard>["draw"]>[0]) => {
      const covered = cssVar(host, "--covered", "#dadddf");
      const revealedColor = cssVar(host, "--revealed", "#f6f7f8");
      const grid = cssVar(host, "--grid", "#aeb5bc");
      const danger = cssVar(host, "--flag", "#d4515d");
      const darkTheme = document.documentElement.dataset.theme === "dark";
      const addPixelTile = (asset: string | undefined, x: number, y: number) => {
        if (!asset) {
          return null;
        }
        const sprite = addSprite(root, textures.get(asset), x + cellWidth / 2, y + cellHeight / 2, cellWidth, cellHeight);
        if (sprite) {
          sprite.texture.source.scaleMode = "nearest";
        }
        return sprite;
      };

      puzzle.values.forEach((rowValues, row) => {
        rowValues.forEach((value, col) => {
          const x = col * cellWidth;
          const y = row * cellHeight;
          const status = visibility[row][col];
          const incorrectlyFlagged = lost && status === "flagged" && value !== MINE;
          const revealedMine = lost && value === MINE && (!classic || status !== "flagged");
          const revealed = status === "revealed" || revealedMine || incorrectlyFlagged;
          const flagged = status === "flagged" && !revealed;
          addRect(root, x, y, cellWidth, cellHeight, revealed ? revealedColor : covered);
          drawCellSurface(root, textures, surface, x, y, cellWidth, cellHeight);

          if (!revealed) {
            const inset = classic ? cellWidth * 0.05 : 3;
            const bevelWidth = classic ? cellWidth * 0.1 : 4;
            const lightAlpha = classic ? 1 : darkTheme ? 0.08 : 0.25;
            addLine(root, [x + inset, y + inset, x + cellWidth - inset, y + inset], classic ? "#f5f5f5" : "#ffffff", bevelWidth, lightAlpha);
            addLine(root, [x + inset, y + inset, x + inset, y + cellHeight - inset], classic ? "#f5f5f5" : "#ffffff", bevelWidth, lightAlpha);
            if (classic) {
              addLine(root, [x + inset, y + cellHeight - inset, x + cellWidth - inset, y + cellHeight - inset], "#808080", bevelWidth);
              addLine(root, [x + cellWidth - inset, y + inset, x + cellWidth - inset, y + cellHeight - inset], "#808080", bevelWidth);
            }
          } else if (classic) {
            const revealedGridWidth = Math.max(2, cellWidth * 0.018);
            addLine(root, [x, y, x + cellWidth, y], "#808080", revealedGridWidth);
            addLine(root, [x, y, x, y + cellHeight], "#808080", revealedGridWidth);
          }

          if (flagged) {
            if (classic) {
              addPixelTile(assets.flag, x, y);
            } else {
              addSprite(root, textures.get(assets.flag), x + cellWidth / 2, y + cellHeight / 2, cellWidth * 0.53);
            }
          }

          if (incorrectlyFlagged) {
            if (classic) {
              addPixelTile(assets.misflagged, x, y);
            } else if (assets.misflagged) {
              addSprite(root, textures.get(assets.misflagged), x + cellWidth / 2, y + cellHeight / 2, cellWidth * 0.48);
            }
          } else if (revealed && value === MINE) {
            if (pressedMine?.[0] === row && pressedMine[1] === col) {
              addRect(root, x + 4, y + 4, cellWidth - 8, cellHeight - 8, danger, undefined, 4).alpha = 0.22;
            }
            const hazardAsset = pressedMine?.[0] === row && pressedMine[1] === col
              ? assets.death ?? assets.hazard
              : assets.hazard;
            if (classic) {
              addPixelTile(hazardAsset, x, y);
            } else {
              addSprite(root, textures.get(hazardAsset), x + cellWidth / 2, y + cellHeight / 2, cellWidth * 0.56);
            }
          } else if (revealed && value > 0) {
            const clueAsset = assets.clueTiles?.[value - 1];
            if (!classic || !addPixelTile(clueAsset, x, y)) {
              addLabel(root, String(value), x + cellWidth / 2, y + cellHeight / 2, {
                color: CLUE_COLORS[Math.min(value, CLUE_COLORS.length - 1)],
                fontSize: cellWidth * 0.42,
                fontWeight: "800",
              });
            }
          }
        });
      });

      if (!classic) {
        const gridGraphic = new Graphics();
        for (let index = 0; index <= puzzle.size; index += 1) {
          gridGraphic.moveTo(index * cellWidth, 0).lineTo(index * cellWidth, 1000);
          gridGraphic.moveTo(0, index * cellHeight).lineTo(1000, index * cellHeight);
        }
        gridGraphic.stroke({ color: grid, width: 3, alpha: 0.8 });
        root.addChild(gridGraphic);
      }
      addRect(root, 2, 2, 996, 996, "transparent", { color: grid, width: 5 }, 4);
    },
    [assets, classic, lost, pressedMine, puzzle, surface, visibility],
  );

  const boardAssets = [
    assets.hazard,
    assets.flag,
    assets.death,
    assets.misflagged,
    ...(assets.clueTiles ?? []),
  ].filter((asset): asset is string => Boolean(asset));

  const animate = useCallback(
    ({ context, host, cellWidth, cellHeight }: CanvasBoardAnimationFrame) => {
      if (celebration === null) {
        return;
      }
      const mines: CellRef[] = [];
      puzzle.values.forEach((rowValues, row) => {
        rowValues.forEach((value, col) => {
          if (value === MINE) {
            mines.push({ row, col });
          }
        });
      });
      drawMinesCelebration(
        {
          context,
          cellWidth,
          cellHeight,
          progress: celebration,
          color: cssVar(host, "--hazard", "#263c3d"),
        },
        mines,
        puzzle.size,
        puzzle.size,
      );
    },
    [celebration, puzzle],
  );

  return (
    <CanvasBoard
      className="board"
      ariaLabel={`${puzzle.size} by ${puzzle.size} Mine Islands board`}
      rows={puzzle.size}
      cols={puzzle.size}
      cells={cells}
      assetUrls={withSurfaceAssets(boardAssets, surface)}
      hud={hud && surface?.hud ? { ...hud, style: surface.hud } : hud}
      draw={draw}
      animate={celebration === null ? undefined : animate}
      onCellActivate={onActivate}
      onCellContextMenu={onContextMenu}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    />
  );
}
