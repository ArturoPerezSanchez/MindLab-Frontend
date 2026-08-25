import { useCallback, useMemo } from "react";
import { Graphics } from "pixi.js";
import {
  CanvasBoard,
  type CanvasBoardAnimationFrame,
  type CanvasBoardHud,
  type CanvasCellPosition,
} from "@/shared/canvas/CanvasBoard";
import { drawCellSurface, withSurfaceAssets } from "@/shared/canvas/surface";
import type { BoardSurface } from "@/features/skins/skins";
import { addCircle, addRect, addSprite, cssVar } from "@/shared/canvas/drawing";
import { drawLightsCelebration, type CellRef } from "@/shared/canvas/winCelebration";
import { sweepOrder, type LightsSweep } from "@/shared/useWinSequence";
import { positionKey } from "./game";
import type { Board } from "./types";

type LightsCanvasProps = {
  /** Material laid over the cell colours by the chosen board. */
  surface?: BoardSurface;
  board: Board;
  bulbs: readonly [string, string];
  solutionPresses: ReadonlySet<string>;
  disabled: boolean;
  hud: CanvasBoardHud;
  /** 0..1 while the solved board celebrates, null when idle. */
  celebration: number | null;
  /** Which sweep pattern this run drew. */
  sweep: LightsSweep;
  onActivate: (position: CanvasCellPosition) => void;
};

export function LightsCanvas({
  surface,
  board,
  bulbs,
  solutionPresses,
  disabled,
  hud,
  celebration,
  sweep,
  onActivate,
}: LightsCanvasProps) {
  const size = board.length;
  const cells = useMemo(
    () =>
      board.flatMap((rowValues, row) =>
        rowValues.map((value, col) => ({
          key: positionKey([row, col]),
          row,
          col,
          disabled,
          label: `Row ${row + 1}, column ${col + 1}: ${value ? "lit" : "dark"}${
            solutionPresses.has(positionKey([row, col])) ? ", solution press" : ""
          }`,
        })),
      ),
    [board, disabled, solutionPresses],
  );

  const draw = useCallback(
    ({ root, textures, host, cellWidth, cellHeight }: Parameters<React.ComponentProps<typeof CanvasBoard>["draw"]>[0]) => {
      const base = cssVar(host, "--cell", "#eef1f3");
      const alt = cssVar(host, "--cell-alt", "#e6eaed");
      const grid = cssVar(host, "--game-grid", "#646b72");
      const glow = cssVar(host, "--glow", "#e8b83f");
      const route = cssVar(host, "--route", "#2f8f83");

      board.forEach((rowValues, row) => {
        rowValues.forEach((value, col) => {
          const x = col * cellWidth;
          const y = row * cellHeight;
          const key = positionKey([row, col]);
          addRect(root, x, y, cellWidth, cellHeight, (row + col) % 2 ? alt : base);
          drawCellSurface(root, textures, surface, x, y, cellWidth, cellHeight);

          if (value === 1) {
            addCircle(root, x + cellWidth / 2, y + cellHeight / 2, cellWidth * 0.34, glow).alpha = 0.12;
          }
          addSprite(
            root,
            textures.get(bulbs[value]),
            x + cellWidth / 2,
            y + cellHeight / 2,
            cellWidth * 0.51,
          );

          if (solutionPresses.has(key)) {
            addCircle(root, x + cellWidth / 2, y + cellHeight / 2, cellWidth * 0.12, route, {
              color: cssVar(host, "--game-surface", "#ffffff"),
              width: 4,
            });
            addRect(root, x + 6, y + 6, cellWidth - 12, cellHeight - 12, "transparent", { color: route, width: 5 }, 5);
          }
        });
      });

      const gridGraphic = new Graphics();
      for (let index = 0; index <= size; index += 1) {
        gridGraphic.moveTo(index * cellWidth, 0).lineTo(index * cellWidth, 1000);
        gridGraphic.moveTo(0, index * cellHeight).lineTo(1000, index * cellHeight);
      }
      gridGraphic.stroke({ color: grid, width: 3, alpha: 0.42 });
      root.addChild(gridGraphic);
      addRect(root, 2, 2, 996, 996, "transparent", { color: grid, width: 5 }, 4);
    },
    [board, bulbs, size, solutionPresses, surface],
  );

  const animate = useCallback(
    ({ context, host, cellWidth, cellHeight }: CanvasBoardAnimationFrame) => {
      if (celebration === null) {
        return;
      }
      const all: CellRef[] = [];
      for (let row = 0; row < size; row += 1) {
        for (let col = 0; col < size; col += 1) {
          all.push({ row, col });
        }
      }
      drawLightsCelebration(
        {
          context,
          cellWidth,
          cellHeight,
          progress: celebration,
          color: cssVar(host, "--lit-glow", "#ffd76a"),
        },
        all,
        (cell) => sweepOrder(sweep, cell.row, cell.col, size),
      );
    },
    [celebration, size, sweep],
  );

  return (
    <CanvasBoard
      className="board"
      ariaLabel={`${size} by ${size} Lights board`}
      rows={size}
      cols={size}
      cells={cells}
      assetUrls={withSurfaceAssets(bulbs, surface)}
      hud={hud && surface?.hud ? { ...hud, style: surface.hud } : hud}
      draw={draw}
      animate={celebration === null ? undefined : animate}
      onCellActivate={onActivate}
    />
  );
}
