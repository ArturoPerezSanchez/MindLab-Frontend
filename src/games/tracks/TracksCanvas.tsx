import { useCallback, useEffect, useMemo, useState } from "react";
import { Graphics, type Container } from "pixi.js";
import type { GameSkinAssetMap } from "@/features/skins/skins";
import {
  CANVAS_BOARD_SIZE,
  CanvasBoard,
  type CanvasBoardAnimationFrame,
  type CanvasBoardHud,
  type CanvasCellPosition,
  type CanvasWheelDirection,
} from "@/shared/canvas/CanvasBoard";
import { drawCellSurface, withSurfaceAssets } from "@/shared/canvas/surface";
import type { BoardSurface } from "@/features/skins/skins";
import { addCircle, addRect, addSprite, cssVar, type CssColor } from "@/shared/canvas/drawing";
import { drawTracksCelebration } from "@/shared/canvas/winCelebration";
import {
  DIRECTIONS,
  DIRECTION_DELTAS,
  OPPOSITE_DIRECTIONS,
  positionKey,
} from "./game";
import type { Board, Puzzle } from "./types";

export type FlowCell = {
  centerPhase: number;
  inbound: number | null;
  outbound: number[];
};

type Point = {
  x: number;
  y: number;
};

type SegmentLayer = "underpass" | "standard" | "overpass";

type PipeSegment = {
  from: Point;
  to: Point;
  layer: SegmentLayer;
};

type FlowSegment = PipeSegment & {
  phase: number;
};

type TrackGeometry = {
  arms: PipeSegment[];
  bridges: PipeSegment[];
  flowSegments: FlowSegment[];
  startPoint: Point;
  endPoint: Point;
};

type TracksCanvasProps = {
  /** Material laid over the cell colours by the chosen board. */
  surface?: BoardSurface;
  board: Board;
  puzzle: Puzzle;
  flow: ReadonlyMap<string, FlowCell>;
  crossingGaps: ReadonlyMap<string, ReadonlySet<number>>;
  assets: GameSkinAssetMap["tracks"];
  /** 0..1 while the solved board celebrates, null when idle. */
  celebration: number | null;
  disabled: boolean;
  solutionShown: boolean;
  hud: CanvasBoardHud;
  onActivate: (position: CanvasCellPosition) => void;
  onWheelRotate: (position: CanvasCellPosition, direction: CanvasWheelDirection) => void;
};

const ARM_RADIUS_RATIO = 0.31;

/*
 * Pipe metrics are fractions of a cell and scale together: the casing sets the
 * gauge, and the channel, fluid, and pulse widths are sized to sit inside it.
 * Changing PIPE_WIDTH_RATIO alone would leave the fluid rattling around in an
 * oversized bore, so keep the ratios between them roughly as they are.
 */
const PIPE_WIDTH_RATIO = 0.3;
const CHANNEL_WIDTH_RATIO = 0.176;
const FLUID_WIDTH_RATIO = 0.137;
const PULSE_WIDTH_RATIO = 0.077;
const NODE_WIDTH_RATIO = 0.38;
const TERMINAL_RADIUS_RATIO = 0.125;
const UNDERPASS_GAP_RATIO = 0.64;

type FlowParticleDefinition = NonNullable<GameSkinAssetMap["tracks"]["flowParticle"]>;

function pointAtDirection(center: Point, direction: number, distance: number): Point {
  const [rowDelta, colDelta] = DIRECTION_DELTAS[direction];
  const magnitude = Math.hypot(rowDelta, colDelta) || 1;
  return {
    x: center.x + (colDelta / magnitude) * distance,
    y: center.y + (rowDelta / magnitude) * distance,
  };
}

function edgeKey(size: number, row: number, col: number, neighborRow: number, neighborCol: number): string {
  const current = row * size + col;
  const neighbor = neighborRow * size + neighborCol;
  return current < neighbor ? `${current}:${neighbor}` : `${neighbor}:${current}`;
}

function midpointKey(segment: PipeSegment): string {
  const x = Math.round(((segment.from.x + segment.to.x) / 2) * 1000);
  const y = Math.round(((segment.from.y + segment.to.y) / 2) * 1000);
  return `${x}:${y}`;
}

function splitAroundMidpoint(segment: PipeSegment, gapLength: number): PipeSegment[] {
  const dx = segment.to.x - segment.from.x;
  const dy = segment.to.y - segment.from.y;
  const segmentLength = Math.hypot(dx, dy);
  if (segmentLength <= gapLength || segmentLength === 0) {
    return [];
  }

  const midpointX = (segment.from.x + segment.to.x) / 2;
  const midpointY = (segment.from.y + segment.to.y) / 2;
  const halfGapScale = gapLength / segmentLength / 2;
  const gapStart = { x: midpointX - dx * halfGapScale, y: midpointY - dy * halfGapScale };
  const gapEnd = { x: midpointX + dx * halfGapScale, y: midpointY + dy * halfGapScale };
  return [
    { from: segment.from, to: gapStart, layer: segment.layer },
    { from: gapEnd, to: segment.to, layer: segment.layer },
  ];
}

function buildGeometry(
  board: Board,
  puzzle: Puzzle,
  flow: ReadonlyMap<string, FlowCell>,
  crossingGaps: ReadonlyMap<string, ReadonlySet<number>>,
): TrackGeometry {
  const size = board.length;
  const cellSize = CANVAS_BOARD_SIZE / size;
  const armRadius = cellSize * ARM_RADIUS_RATIO;
  const arms: PipeSegment[] = [];
  const bridges: PipeSegment[] = [];
  const bridgesByEdge = new Map<string, PipeSegment>();

  const centerFor = (row: number, col: number): Point => ({
    x: (col + 0.5) * cellSize,
    y: (row + 0.5) * cellSize,
  });

  board.forEach((rowValues, row) => {
    rowValues.forEach((mask, col) => {
      const center = centerFor(row, col);
      for (const direction of DIRECTIONS) {
        if (!(mask & direction)) {
          continue;
        }

        const socket = pointAtDirection(center, direction, armRadius);
        arms.push({ from: center, to: socket, layer: "standard" });

        const [rowDelta, colDelta] = DIRECTION_DELTAS[direction];
        const neighborRow = row + rowDelta;
        const neighborCol = col + colDelta;
        if (
          neighborRow < 0 ||
          neighborCol < 0 ||
          neighborRow >= size ||
          neighborCol >= size ||
          !(board[neighborRow][neighborCol] & OPPOSITE_DIRECTIONS[direction])
        ) {
          continue;
        }

        const connectionKey = edgeKey(size, row, col, neighborRow, neighborCol);
        if (bridgesByEdge.has(connectionKey)) {
          continue;
        }

        const neighborCenter = centerFor(neighborRow, neighborCol);
        const neighborSocket = pointAtDirection(
          neighborCenter,
          OPPOSITE_DIRECTIONS[direction],
          armRadius,
        );
        const isUnderpass =
          Boolean(crossingGaps.get(positionKey([row, col]))?.has(direction)) ||
          Boolean(
            crossingGaps
              .get(positionKey([neighborRow, neighborCol]))
              ?.has(OPPOSITE_DIRECTIONS[direction]),
          );
        const bridge: PipeSegment = {
          from: socket,
          to: neighborSocket,
          layer: isUnderpass ? "underpass" : "standard",
        };
        bridges.push(bridge);
        bridgesByEdge.set(connectionKey, bridge);
      }
    });
  });

  const bridgesAtMidpoint = new Map<string, PipeSegment[]>();
  for (const bridge of bridges) {
    const key = midpointKey(bridge);
    const group = bridgesAtMidpoint.get(key) ?? [];
    group.push(bridge);
    bridgesAtMidpoint.set(key, group);
  }
  for (const group of bridgesAtMidpoint.values()) {
    if (group.some((bridge) => bridge.layer === "underpass")) {
      group.forEach((bridge) => {
        if (bridge.layer === "standard") {
          bridge.layer = "overpass";
        }
      });
    }
  }

  const flowSegments: FlowSegment[] = [];
  const seenFlowEdges = new Set<string>();
  board.forEach((rowValues, row) => {
    rowValues.forEach((mask, col) => {
      const cellFlow = flow.get(positionKey([row, col]));
      if (!cellFlow) {
        return;
      }

      const center = centerFor(row, col);
      const phase = (cellFlow.centerPhase * cellSize) / 100;
      for (const direction of cellFlow.outbound) {
        const [rowDelta, colDelta] = DIRECTION_DELTAS[direction];
        const neighborRow = row + rowDelta;
        const neighborCol = col + colDelta;
        const connectionKey = edgeKey(size, row, col, neighborRow, neighborCol);
        if (seenFlowEdges.has(connectionKey)) {
          continue;
        }
        seenFlowEdges.add(connectionKey);
        flowSegments.push({
          from: center,
          to: centerFor(neighborRow, neighborCol),
          layer: bridgesByEdge.get(connectionKey)?.layer ?? "standard",
          phase,
        });
      }

      for (const direction of DIRECTIONS) {
        if (!(mask & direction)) {
          continue;
        }
        const [rowDelta, colDelta] = DIRECTION_DELTAS[direction];
        const neighborRow = row + rowDelta;
        const neighborCol = col + colDelta;
        const isReciprocal =
          neighborRow >= 0 &&
          neighborCol >= 0 &&
          neighborRow < size &&
          neighborCol < size &&
          Boolean(board[neighborRow][neighborCol] & OPPOSITE_DIRECTIONS[direction]);
        if (!isReciprocal) {
          flowSegments.push({
            from: center,
            to: pointAtDirection(center, direction, armRadius),
            layer: "standard",
            phase,
          });
        }
      }
    });
  });

  return {
    arms,
    bridges,
    flowSegments,
    startPoint: centerFor(puzzle.start[0], puzzle.start[1]),
    endPoint: centerFor(puzzle.end[0], puzzle.end[1]),
  };
}

function strokeSegments(
  root: Container,
  segments: readonly PipeSegment[],
  color: CssColor,
  width: number,
  alpha = 1,
  cap: CanvasLineCap = "round",
): void {
  if (segments.length === 0) {
    return;
  }
  const graphic = new Graphics();
  segments.forEach(({ from, to }) => {
    graphic.moveTo(from.x, from.y).lineTo(to.x, to.y);
  });
  graphic.stroke({ color, width, alpha, cap, join: "round" });
  root.addChild(graphic);
}

function drawCanvasSegments(
  context: CanvasRenderingContext2D,
  segments: readonly FlowSegment[],
  elapsedMilliseconds: number,
  cellWidth: number,
): void {
  const travelled = -(elapsedMilliseconds * cellWidth * 0.78) / 1000;
  const dash = cellWidth * 0.12;
  const gap = cellWidth * 0.17;
  context.setLineDash([dash, gap]);
  segments.forEach(({ from, to, phase }) => {
    context.lineDashOffset = travelled - phase;
    context.beginPath();
    context.moveTo(from.x, from.y);
    context.lineTo(to.x, to.y);
    context.stroke();
  });
  context.setLineDash([]);
}

/**
 * Unit normal pointing toward the scene light, which sits at the upper left.
 *
 * Every shading pass offsets along this vector so highlights stay on the same
 * side of every pipe regardless of which of the eight directions it runs in.
 */
function litNormal(segment: PipeSegment): Point {
  const dx = segment.to.x - segment.from.x;
  const dy = segment.to.y - segment.from.y;
  const length = Math.hypot(dx, dy) || 1;
  const normalX = -dy / length;
  const normalY = dx / length;
  const facesLight = normalX * -0.7071 + normalY * -0.7071 >= 0;
  return facesLight ? { x: normalX, y: normalY } : { x: -normalX, y: -normalY };
}

function offsetSegments(segments: readonly PipeSegment[], distance: number): PipeSegment[] {
  return segments.map((segment) => {
    const normal = litNormal(segment);
    const shiftX = normal.x * distance;
    const shiftY = normal.y * distance;
    return {
      from: { x: segment.from.x + shiftX, y: segment.from.y + shiftY },
      to: { x: segment.to.x + shiftX, y: segment.to.y + shiftY },
      layer: segment.layer,
    };
  });
}

/**
 * Draws a pipe as a lit cylinder rather than a flat band.
 *
 * Three stacked strokes do the work: the full-width casing, a narrower band
 * shifted toward the light, and a thin specular line near the top edge. It is
 * cheap, needs no gradients in the static PIXI layer, and survives any pipe
 * direction because the offsets follow `litNormal`.
 */
function strokeCylinder(
  root: Container,
  segments: readonly PipeSegment[],
  width: number,
  colors: { casing: CssColor; body: CssColor; highlight: CssColor },
  cap: CanvasLineCap = "round",
): void {
  if (segments.length === 0) {
    return;
  }

  // Offsets are positive because `litNormal` already points at the light.
  strokeSegments(root, segments, colors.casing, width, 1, cap);
  strokeSegments(root, offsetSegments(segments, width * 0.1), colors.body, width * 0.66, 0.85, cap);
  strokeSegments(
    root,
    offsetSegments(segments, width * 0.27),
    colors.highlight,
    width * 0.16,
    0.5,
    cap,
  );
}

/**
 * Walks the completed track from the start terminal to the end one.
 *
 * `geometry.flowSegments` cannot be used for this: it is a bag of per-cell
 * arms in draw order, not a traversal, so chaining its endpoints produces a
 * line that jumps around the board. This follows the actual mask connections
 * instead, refusing to step back the way it came, and yields cell centres.
 */
function buildRoute(
  board: Board,
  puzzle: Puzzle,
  cellWidth: number,
  cellHeight: number,
): Point[] {
  const size = board.length;
  const centre = (row: number, col: number): Point => ({
    x: (col + 0.5) * cellWidth,
    y: (row + 0.5) * cellHeight,
  });

  let [row, col] = puzzle.start;
  let arrivedFrom: number | null = null;
  const points: Point[] = [centre(row, col)];

  // A finished route visits each cell at most once, so the cell count is a
  // safe bound and guards against a malformed board looping forever.
  for (let step = 0; step < size * size; step += 1) {
    if (row === puzzle.end[0] && col === puzzle.end[1]) {
      break;
    }

    const mask = board[row]?.[col] ?? 0;
    let advanced = false;

    for (const direction of DIRECTIONS) {
      if ((mask & direction) === 0 || direction === arrivedFrom) {
        continue;
      }
      const [deltaRow, deltaCol] = DIRECTION_DELTAS[direction];
      const nextRow = row + deltaRow;
      const nextCol = col + deltaCol;
      if (nextRow < 0 || nextCol < 0 || nextRow >= size || nextCol >= size) {
        continue;
      }
      // Only follow a link the neighbouring cell agrees to.
      if ((board[nextRow][nextCol] & OPPOSITE_DIRECTIONS[direction]) === 0) {
        continue;
      }
      row = nextRow;
      col = nextCol;
      arrivedFrom = OPPOSITE_DIRECTIONS[direction];
      points.push(centre(row, col));
      advanced = true;
      break;
    }

    if (!advanced) {
      break;
    }
  }

  return points;
}

function flowTurnPoints(segments: readonly FlowSegment[]): Point[] {
  const junctions = new Map<string, { point: Point; vectors: Point[] }>();
  const addVector = (point: Point, other: Point) => {
    const key = `${Math.round(point.x * 1000)}:${Math.round(point.y * 1000)}`;
    const junction = junctions.get(key) ?? { point, vectors: [] };
    junction.vectors.push({ x: other.x - point.x, y: other.y - point.y });
    junctions.set(key, junction);
  };

  segments.forEach(({ from, to }) => {
    addVector(from, to);
    addVector(to, from);
  });

  return [...junctions.values()]
    .filter(({ vectors }) =>
      vectors.some((first, firstIndex) =>
        vectors.slice(firstIndex + 1).some((second) => {
          const magnitude = Math.hypot(first.x, first.y) * Math.hypot(second.x, second.y);
          return magnitude > 0 && Math.abs(first.x * second.y - first.y * second.x) / magnitude > 0.08;
        }),
      ),
    )
    .map(({ point }) => point);
}

function drawLiquidSegments(
  context: CanvasRenderingContext2D,
  segments: readonly FlowSegment[],
  elapsedMilliseconds: number,
  cellWidth: number,
  colors: { body: string; glow: string; highlight: string; shadow: string },
): void {
  if (segments.length === 0) {
    return;
  }

  const liquidWidth = cellWidth * FLUID_WIDTH_RATIO * 1.06;
  const travelled = -(elapsedMilliseconds * cellWidth * 0.34) / 1000;
  const turns = flowTurnPoints(segments);

  context.save();
  context.lineCap = "round";
  context.lineJoin = "round";
  context.shadowColor = colors.glow;
  context.shadowBlur = cellWidth * 0.02;

  context.lineWidth = liquidWidth * 1.14;
  context.strokeStyle = colors.shadow;
  context.globalAlpha = 0.66;
  segments.forEach(({ from, to }) => {
    context.beginPath();
    context.moveTo(from.x, from.y);
    context.lineTo(to.x, to.y);
    context.stroke();
  });
  turns.forEach((point) => {
    context.fillStyle = colors.shadow;
    context.beginPath();
    context.arc(point.x, point.y, liquidWidth * 0.57, 0, Math.PI * 2);
    context.fill();
  });

  context.lineWidth = liquidWidth;
  context.globalAlpha = 0.94;

  segments.forEach(({ from, to }) => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.hypot(dx, dy);
    if (length === 0) {
      return;
    }

    const normalX = -dy / length;
    const normalY = dx / length;
    const midpointX = (from.x + to.x) / 2;
    const midpointY = (from.y + to.y) / 2;
    const gradient = context.createLinearGradient(
      midpointX - normalX * liquidWidth * 0.58,
      midpointY - normalY * liquidWidth * 0.58,
      midpointX + normalX * liquidWidth * 0.58,
      midpointY + normalY * liquidWidth * 0.58,
    );
    gradient.addColorStop(0, colors.shadow);
    gradient.addColorStop(0.15, colors.body);
    gradient.addColorStop(0.38, colors.highlight);
    gradient.addColorStop(0.53, colors.body);
    gradient.addColorStop(0.82, colors.body);
    gradient.addColorStop(1, colors.shadow);
    context.strokeStyle = gradient;
    context.beginPath();
    context.moveTo(from.x, from.y);
    context.lineTo(to.x, to.y);
    context.stroke();
  });

  context.shadowBlur = 0;
  turns.forEach((point) => {
    const gradient = context.createRadialGradient(
      point.x - liquidWidth * 0.16,
      point.y - liquidWidth * 0.18,
      0,
      point.x,
      point.y,
      liquidWidth * 0.56,
    );
    gradient.addColorStop(0, colors.highlight);
    gradient.addColorStop(0.18, colors.body);
    gradient.addColorStop(0.72, colors.body);
    gradient.addColorStop(1, colors.shadow);
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(point.x, point.y, liquidWidth * 0.54, 0, Math.PI * 2);
    context.fill();
  });

  context.globalCompositeOperation = "lighter";
  context.strokeStyle = colors.highlight;
  context.shadowColor = colors.glow;
  context.shadowBlur = cellWidth * 0.025;
  context.lineWidth = Math.max(1, cellWidth * 0.011);
  context.globalAlpha = 0.22;
  context.setLineDash([cellWidth * 0.22, cellWidth * 0.13]);
  segments.forEach(({ from, to, phase }) => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.hypot(dx, dy) || 1;
    const offsetX = (-dy / length) * liquidWidth * 0.2;
    const offsetY = (dx / length) * liquidWidth * 0.2;
    context.lineDashOffset = travelled - phase;
    context.beginPath();
    context.moveTo(from.x + offsetX, from.y + offsetY);
    context.lineTo(to.x + offsetX, to.y + offsetY);
    context.stroke();
  });

  context.globalAlpha = 0.1;
  context.lineWidth = Math.max(0.8, cellWidth * 0.009);
  context.setLineDash([cellWidth * 0.12, cellWidth * 0.2]);
  segments.forEach(({ from, to, phase }) => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.hypot(dx, dy) || 1;
    const offsetX = (dy / length) * liquidWidth * 0.22;
    const offsetY = (-dx / length) * liquidWidth * 0.22;
    context.lineDashOffset = travelled * 0.72 - phase + cellWidth * 0.09;
    context.beginPath();
    context.moveTo(from.x + offsetX, from.y + offsetY);
    context.lineTo(to.x + offsetX, to.y + offsetY);
    context.stroke();
  });

  context.setLineDash([]);
  context.globalAlpha = 0.18;
  context.lineWidth = Math.max(1, cellWidth * 0.012);
  turns.forEach((point, index) => {
    const startAngle = elapsedMilliseconds * 0.0022 + index * 1.73;
    context.beginPath();
    context.arc(point.x, point.y, liquidWidth * 0.25, startAngle, startAngle + Math.PI * 0.72);
    context.stroke();
    context.globalAlpha = 0.1;
    context.beginPath();
    context.arc(point.x, point.y, liquidWidth * 0.36, -startAngle, -startAngle + Math.PI * 0.55);
    context.stroke();
    context.globalAlpha = 0.18;
  });

  context.restore();
}

type OilColors = {
  body: string;
  shadow: string;
  highlight: string;
  glow: string;
  sheen: readonly string[];
};

/**
 * Heavy crude creeping through steel.
 *
 * The look is built from six passes, cheapest first, all clipped to the pipe
 * run by stroke width alone:
 *
 * 1. a soft dark bloom that seats the fluid inside the channel
 * 2. a cross-section gradient per segment, dark at the walls and warmer at the
 *    centre, which is what sells the round volume
 * 3. filled turn caps so corners stay continuous instead of showing a seam
 * 4. a slow iridescent sheen in `overlay`, the oil-slick rainbow
 * 5. a thin specular line offset toward the light, breathing slightly
 * 6. sparse elongated globs drifting downstream to read as motion
 *
 * Oil is deliberately slower and lower-contrast than the coolant material -
 * viscosity is most of the effect.
 */
function drawOilSegments(
  context: CanvasRenderingContext2D,
  segments: readonly FlowSegment[],
  definition: FlowParticleDefinition,
  elapsedMilliseconds: number,
  cellWidth: number,
  colors: OilColors,
): void {
  if (segments.length === 0) {
    return;
  }

  const oilWidth = cellWidth * FLUID_WIDTH_RATIO * 1.32;
  const flowSpeed = cellWidth * definition.speed;
  const globSpacing = cellWidth * definition.spacing;
  const strength = definition.opacity ?? 1;
  const travelled = -(elapsedMilliseconds * flowSpeed) / 1000;
  const turns = flowTurnPoints(segments);
  const breathe = 0.82 + Math.sin(elapsedMilliseconds * 0.0011) * 0.18;

  context.save();
  context.lineCap = "round";
  context.lineJoin = "round";

  context.strokeStyle = colors.shadow;
  context.globalAlpha = 0.5;
  context.lineWidth = oilWidth * 1.5;
  context.shadowColor = colors.glow;
  context.shadowBlur = cellWidth * 0.05;
  segments.forEach(({ from, to }) => {
    context.beginPath();
    context.moveTo(from.x, from.y);
    context.lineTo(to.x, to.y);
    context.stroke();
  });
  context.shadowBlur = 0;

  context.globalAlpha = 1;
  context.lineWidth = oilWidth;
  segments.forEach((segment) => {
    const { from, to } = segment;
    const normal = litNormal(segment);
    const midpointX = (from.x + to.x) / 2;
    const midpointY = (from.y + to.y) / 2;
    const reach = oilWidth * 0.62;
    const gradient = context.createLinearGradient(
      midpointX + normal.x * reach,
      midpointY + normal.y * reach,
      midpointX - normal.x * reach,
      midpointY - normal.y * reach,
    );
    // Stop 0 is the lit edge, so the specular band sits left of centre and
    // both walls fall away to shadow - a cylinder cross-section, not a tube.
    gradient.addColorStop(0, colors.shadow);
    gradient.addColorStop(0.18, colors.body);
    gradient.addColorStop(0.33, colors.highlight);
    gradient.addColorStop(0.55, colors.body);
    gradient.addColorStop(1, colors.shadow);
    context.strokeStyle = gradient;
    context.beginPath();
    context.moveTo(from.x, from.y);
    context.lineTo(to.x, to.y);
    context.stroke();
  });

  turns.forEach((point) => {
    const gradient = context.createRadialGradient(
      point.x - oilWidth * 0.2,
      point.y - oilWidth * 0.22,
      0,
      point.x,
      point.y,
      oilWidth * 0.62,
    );
    gradient.addColorStop(0, colors.highlight);
    gradient.addColorStop(0.34, colors.body);
    gradient.addColorStop(1, colors.shadow);
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(point.x, point.y, oilWidth * 0.56, 0, Math.PI * 2);
    context.fill();
  });

  if (colors.sheen.length > 1) {
    context.globalCompositeOperation = "overlay";
    context.lineWidth = oilWidth * 0.82;
    context.globalAlpha = 0.62;
    const sheenSpan = cellWidth * 1.9;
    const drift = ((elapsedMilliseconds * flowSpeed * 0.45) / 1000) % sheenSpan;
    segments.forEach(({ from, to, phase }) => {
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const length = Math.hypot(dx, dy) || 1;
      const unitX = dx / length;
      const unitY = dy / length;
      const originX = from.x - unitX * (drift + phase * 0.4);
      const originY = from.y - unitY * (drift + phase * 0.4);
      const gradient = context.createLinearGradient(
        originX,
        originY,
        originX + unitX * sheenSpan,
        originY + unitY * sheenSpan,
      );
      colors.sheen.forEach((color, index) => {
        gradient.addColorStop(index / (colors.sheen.length - 1), color);
      });
      context.strokeStyle = gradient;
      context.beginPath();
      context.moveTo(from.x, from.y);
      context.lineTo(to.x, to.y);
      context.stroke();
    });
    context.globalCompositeOperation = "source-over";
  }

  context.strokeStyle = colors.highlight;
  context.globalAlpha = 0.3 * breathe;
  context.lineWidth = Math.max(1, oilWidth * 0.13);
  segments.forEach((segment) => {
    const normal = litNormal(segment);
    const shiftX = normal.x * oilWidth * 0.26;
    const shiftY = normal.y * oilWidth * 0.26;
    context.beginPath();
    context.moveTo(segment.from.x + shiftX, segment.from.y + shiftY);
    context.lineTo(segment.to.x + shiftX, segment.to.y + shiftY);
    context.stroke();
  });

  // Slugs of heavier oil riding downstream. This is the pass that actually
  // communicates flow, so it is wide, bright, and unmistakably in motion.
  const slugLength = globSpacing * 0.52;
  const slugGap = globSpacing;
  context.globalAlpha = 0.62 * strength;
  context.lineWidth = oilWidth * 0.72;
  context.strokeStyle = colors.highlight;
  context.shadowColor = colors.glow;
  context.shadowBlur = cellWidth * 0.03;
  context.setLineDash([slugLength, slugGap]);
  segments.forEach(({ from, to, phase }) => {
    context.lineDashOffset = travelled - phase;
    context.beginPath();
    context.moveTo(from.x, from.y);
    context.lineTo(to.x, to.y);
    context.stroke();
  });
  context.shadowBlur = 0;

  // A tighter glint sitting on the lit crown of each slug, running at the same
  // speed so the two read as one moving body rather than two effects.
  context.globalAlpha = 0.85 * strength * breathe;
  context.lineWidth = Math.max(1.2, oilWidth * 0.2);
  context.setLineDash([slugLength * 0.42, slugGap + slugLength * 0.58]);
  segments.forEach((segment) => {
    const normal = litNormal(segment);
    const shiftX = normal.x * oilWidth * 0.24;
    const shiftY = normal.y * oilWidth * 0.24;
    context.lineDashOffset = travelled - segment.phase + slugLength * 0.2;
    context.beginPath();
    context.moveTo(segment.from.x + shiftX, segment.from.y + shiftY);
    context.lineTo(segment.to.x + shiftX, segment.to.y + shiftY);
    context.stroke();
  });

  // Trailing wake behind each slug, half speed and barely there, which gives
  // the motion somewhere to come from.
  context.globalAlpha = 0.22 * strength;
  context.lineWidth = oilWidth * 0.34;
  context.setLineDash([slugLength * 1.6, slugGap * 0.7]);
  segments.forEach(({ from, to, phase }) => {
    context.lineDashOffset = travelled * 0.55 - phase;
    context.beginPath();
    context.moveTo(from.x, from.y);
    context.lineTo(to.x, to.y);
    context.stroke();
  });

  context.setLineDash([]);
  context.restore();
}

function drawFlowParticles(
  context: CanvasRenderingContext2D,
  segments: readonly FlowSegment[],
  image: HTMLImageElement,
  definition: FlowParticleDefinition,
  elapsedMilliseconds: number,
  cellWidth: number,
  glow: string,
): void {
  const spacing = Math.max(1, cellWidth * definition.spacing);
  const travelled = -(elapsedMilliseconds * cellWidth * definition.speed) / 1000;
  const opacity = definition.opacity ?? 1;
  const drift = cellWidth * (definition.drift ?? 0);
  const flicker = definition.flicker ?? 0;

  context.save();
  context.globalCompositeOperation = definition.additive ? "lighter" : "source-over";
  context.shadowColor = glow;
  context.shadowBlur = cellWidth * (definition.additive ? 0.1 : 0.035);

  segments.forEach(({ from, to, phase }, segmentIndex) => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.hypot(dx, dy);
    if (length <= 0) {
      return;
    }

    const firstParticle = Math.ceil((phase - travelled) / spacing);
    const lastParticle = Math.floor((phase + length - travelled) / spacing);
    const angle = Math.atan2(dy, dx);
    const normalX = -dy / length;
    const normalY = dx / length;

    for (let particleIndex = firstParticle; particleIndex <= lastParticle; particleIndex += 1) {
      const routeDistance = travelled + particleIndex * spacing;
      const segmentProgress = (routeDistance - phase) / length;
      const seed = Math.abs(Math.sin(particleIndex * 12.9898 + segmentIndex * 7.233));
      const size = cellWidth * definition.size * (0.72 + seed * 0.28);
      const lateralOffset = Math.sin(elapsedMilliseconds * 0.004 + particleIndex * 1.73) * drift;
      const flickerAmount = 1 - flicker + flicker * (0.5 + 0.5 * Math.sin(elapsedMilliseconds * 0.025 + particleIndex));
      const x = from.x + dx * segmentProgress + normalX * lateralOffset;
      const y = from.y + dy * segmentProgress + normalY * lateralOffset;

      context.save();
      context.translate(x, y);
      if (definition.rotateToPath) {
        context.rotate(angle - Math.PI / 2);
      }
      context.globalAlpha = opacity * flickerAmount;
      context.drawImage(image, -size / 2, -size / 2, size, size);
      context.restore();
    }
  });

  context.restore();
}

export function TracksCanvas({
  surface,
  board,
  puzzle,
  flow,
  crossingGaps,
  assets,
  celebration,
  disabled,
  solutionShown,
  hud,
  onActivate,
  onWheelRotate,
}: TracksCanvasProps) {
  const [particleImage, setParticleImage] = useState<HTMLImageElement | null>(null);
  const particleDefinition = assets.flowParticle;
  const assetUrls = useMemo(
    // Materials that draw their own flow (oil) carry no sprite, so the optional
    // src must be filtered out rather than handed to the texture loader.
    () => [assets.node, ...(particleDefinition?.src ? [particleDefinition.src] : [])],
    [assets.node, particleDefinition],
  );
  const cells = useMemo(
    () =>
      board.flatMap((rowValues, row) =>
        rowValues.map((mask, col) => {
          const isStart = puzzle.start[0] === row && puzzle.start[1] === col;
          const isEnd = puzzle.end[0] === row && puzzle.end[1] === col;
          return {
            key: positionKey([row, col]),
            row,
            col,
            disabled: disabled || mask === 0,
            label: `Row ${row + 1}, column ${col + 1}${
              mask === 0 ? ", empty" : isStart ? ", start track" : isEnd ? ", end track" : ", track piece"
            }`,
          };
        }),
      ),
    [board, disabled, puzzle.end, puzzle.start],
  );

  const geometry = useMemo(
    () => buildGeometry(board, puzzle, flow, crossingGaps),
    [board, crossingGaps, flow, puzzle],
  );

  useEffect(() => {
    // Materials that render their own flow declare no sprite source.
    if (!particleDefinition?.src) {
      setParticleImage(null);
      return;
    }

    let cancelled = false;
    const image = new Image();
    setParticleImage(null);
    image.decoding = "async";
    image.onload = () => {
      if (!cancelled) {
        setParticleImage(image);
      }
    };
    image.src = particleDefinition.src;

    return () => {
      cancelled = true;
    };
  }, [particleDefinition]);

  const draw = useCallback(
    ({ root, textures, host, size, cellWidth, cellHeight }: Parameters<React.ComponentProps<typeof CanvasBoard>["draw"]>[0]) => {
      const cell = cssVar(host, "--cell", "#edf1f3");
      const empty = cssVar(host, "--empty-cell", "#dfe6e9");
      const grid = cssVar(host, "--game-grid", "#626a70");
      const track = cssVar(host, "--track", "#415a66");
      const channel = cssVar(host, "--track-channel", "#b8c4c9");
      const fluid = solutionShown ? cssVar(host, "--gold", "#d3a44a") : cssVar(host, "--flow", "#15967f");
      const start = cssVar(host, "--start", "#3686ae");
      const end = cssVar(host, "--end", "#d85f50");
      const surfaceColor = cssVar(host, "--game-surface", "#ffffff");
      const nodeTint = cssVar(host, "--track-node-asset", track);
      const pipeWidth = cellWidth * PIPE_WIDTH_RATIO;
      const channelWidth = cellWidth * CHANNEL_WIDTH_RATIO;
      const fluidWidth = cellWidth * FLUID_WIDTH_RATIO;

      board.forEach((rowValues, row) => {
        rowValues.forEach((mask, col) => {
          const x = col * cellWidth;
          const y = row * cellHeight;
          const centerX = x + cellWidth / 2;
          const centerY = y + cellHeight / 2;
          const isStart = puzzle.start[0] === row && puzzle.start[1] === col;
          const isEnd = puzzle.end[0] === row && puzzle.end[1] === col;
          addRect(root, x, y, cellWidth, cellHeight, mask === 0 ? empty : cell);
          drawCellSurface(root, textures, surface, x, y, cellWidth, cellHeight);
          if (isStart || isEnd) {
            addCircle(root, centerX, centerY, cellWidth * 0.34, isStart ? start : end).alpha = 0.13;
          }
        });
      });

      const gridGraphic = new Graphics();
      for (let row = 0; row <= board.length; row += 1) {
        gridGraphic.moveTo(0, row * cellHeight).lineTo(size, row * cellHeight);
      }
      for (let col = 0; col <= board.length; col += 1) {
        gridGraphic.moveTo(col * cellWidth, 0).lineTo(col * cellWidth, size);
      }
      gridGraphic.stroke({ color: grid, width: 2, alpha: 0.24 });
      root.addChild(gridGraphic);

      const underpassSegments = geometry.bridges
        .filter((segment) => segment.layer === "underpass")
        .flatMap((segment) => splitAroundMidpoint(segment, pipeWidth * UNDERPASS_GAP_RATIO));
      const foregroundSegments = [
        ...geometry.arms,
        ...geometry.bridges.filter((segment) => segment.layer !== "underpass"),
      ];
      if (assets.pipeStyle === "cylindrical") {
        const casing = cssVar(host, "--track-casing", track);
        const sheen = cssVar(host, "--track-sheen", channel);
        const cylinder = { casing: track, body: casing, highlight: sheen };
        strokeCylinder(root, underpassSegments, pipeWidth, cylinder, "butt");
        strokeCylinder(root, foregroundSegments, pipeWidth, cylinder);
        strokeSegments(root, underpassSegments, channel, channelWidth * 0.8, 0.75, "butt");
        strokeSegments(root, foregroundSegments, channel, channelWidth * 0.8, 0.75);
      } else {
        strokeSegments(root, underpassSegments, track, pipeWidth, 1, "butt");
        strokeSegments(root, foregroundSegments, track, pipeWidth);
        strokeSegments(root, underpassSegments, channel, channelWidth, 1, "butt");
        strokeSegments(root, foregroundSegments, channel, channelWidth);
      }

      board.forEach((rowValues, row) => {
        rowValues.forEach((mask, col) => {
          if (mask === 0) {
            return;
          }
          const centerX = (col + 0.5) * cellWidth;
          const centerY = (row + 0.5) * cellHeight;
          const node = addSprite(
            root,
            textures.get(assets.node),
            centerX,
            centerY,
            cellWidth * NODE_WIDTH_RATIO,
          );
          if (node) {
            node.tint = nodeTint;
          } else {
            addCircle(root, centerX, centerY, cellWidth * PIPE_WIDTH_RATIO * 0.58, track);
            addCircle(root, centerX, centerY, cellWidth * PIPE_WIDTH_RATIO * 0.32, channel);
          }
        });
      });

      const lowerFlow = geometry.flowSegments.filter((segment) => segment.layer !== "overpass");
      const overpassFlow = geometry.flowSegments.filter((segment) => segment.layer === "overpass");
      strokeSegments(root, lowerFlow, fluid, fluidWidth * 1.7, 0.18);
      strokeSegments(root, lowerFlow, fluid, fluidWidth);

      const overpassBridges = geometry.bridges.filter((segment) => segment.layer === "overpass");
      if (assets.pipeStyle === "cylindrical") {
        strokeCylinder(
          root,
          overpassBridges,
          pipeWidth,
          {
            casing: track,
            body: cssVar(host, "--track-casing", track),
            highlight: cssVar(host, "--track-sheen", channel),
          },
          "butt",
        );
        strokeSegments(root, overpassBridges, channel, channelWidth * 0.8, 0.75, "butt");
      } else {
        strokeSegments(root, overpassBridges, track, pipeWidth, 1, "butt");
        strokeSegments(root, overpassBridges, channel, channelWidth, 1, "butt");
      }
      strokeSegments(root, overpassFlow, fluid, fluidWidth * 1.7, 0.18);
      strokeSegments(root, overpassFlow, fluid, fluidWidth);

      const terminalRadius = cellWidth * TERMINAL_RADIUS_RATIO;
      addCircle(root, geometry.startPoint.x, geometry.startPoint.y, terminalRadius, start, {
        color: surfaceColor,
        width: 4,
      });
      addCircle(root, geometry.endPoint.x, geometry.endPoint.y, terminalRadius, end, {
        color: surfaceColor,
        width: 4,
      });
      addRect(root, 2, 2, size - 4, size - 4, "transparent", { color: grid, width: 5 }, 4);
    },
    [assets.node, assets.pipeStyle, board, geometry, puzzle.end, puzzle.start, solutionShown, surface],
  );

  const animate = useCallback(
    ({ context, host, elapsedMilliseconds, cellWidth }: CanvasBoardAnimationFrame) => {
      if (geometry.flowSegments.length === 0) {
        return;
      }

      const pulse = solutionShown
        ? cssVar(host, "--gold-soft", "#f1dda7")
        : cssVar(host, "--flow-bright", "#73d7c4");
      const glow = solutionShown
        ? cssVar(host, "--gold", "#d3a44a")
        : cssVar(host, "--flow-glow", "rgba(21, 150, 127, 0.42)");
      const fluid = solutionShown
        ? cssVar(host, "--gold", "#d3a44a")
        : cssVar(host, "--flow", "#15967f");
      const fluidShadow = solutionShown
        ? cssVar(host, "--gold", "#d3a44a")
        : cssVar(host, "--flow-shadow", "#0b6658");
      const start = cssVar(host, "--start", "#3686ae");
      const end = cssVar(host, "--end", "#d85f50");
      const surfaceColor = cssVar(host, "--game-surface", "#ffffff");
      const sheenColors = [
        cssVar(host, "--flow-sheen-1", "#6f56c8"),
        cssVar(host, "--flow-sheen-2", "#2f8fbf"),
        cssVar(host, "--flow-sheen-3", "#33a883"),
        cssVar(host, "--flow-sheen-4", "#c7912f"),
        cssVar(host, "--flow-sheen-5", "#b34a6b"),
      ];
      const lowerFlow = geometry.flowSegments.filter((segment) => segment.layer !== "overpass");
      const overpassFlow = geometry.flowSegments.filter((segment) => segment.layer === "overpass");
      const overpassBridges = geometry.bridges.filter((segment) => segment.layer === "overpass");

      const drawFlowLayer = (segments: readonly FlowSegment[]) => {
        if (segments.length === 0) {
          return;
        }

        if (particleDefinition?.material === "oil") {
          drawOilSegments(context, segments, particleDefinition, elapsedMilliseconds, cellWidth, {
            body: fluid,
            glow,
            highlight: pulse,
            shadow: fluidShadow,
            // The reveal state repaints everything gold, where a rainbow sheen
            // would fight the signal, so iridescence is dropped there.
            sheen: solutionShown ? [] : sheenColors,
          });
        } else if (particleDefinition?.material === "liquid") {
          drawLiquidSegments(context, segments, elapsedMilliseconds, cellWidth, {
            body: fluid,
            glow,
            highlight: pulse,
            shadow: fluidShadow,
          });
        } else {
          context.save();
          context.lineCap = "round";
          context.lineJoin = "round";
          context.lineWidth = cellWidth * PULSE_WIDTH_RATIO;
          context.strokeStyle = pulse;
          context.shadowColor = glow;
          context.shadowBlur = cellWidth * 0.075;
          context.globalAlpha = particleDefinition?.pulseOpacity ?? 1;
          drawCanvasSegments(context, segments, elapsedMilliseconds, cellWidth);
          context.restore();
        }

        if (particleImage && particleDefinition) {
          drawFlowParticles(
            context,
            segments,
            particleImage,
            particleDefinition,
            elapsedMilliseconds,
            cellWidth,
            glow,
          );
        }
      };

      context.save();
      drawFlowLayer(lowerFlow);

      if (overpassBridges.length > 0) {
        context.save();
        context.globalCompositeOperation = "destination-out";
        context.globalAlpha = 1;
        context.lineCap = "butt";
        context.shadowBlur = 0;
        context.lineWidth = cellWidth * PIPE_WIDTH_RATIO * 1.08;
        context.strokeStyle = "#000";
        context.setLineDash([]);
        overpassBridges.forEach(({ from, to }) => {
          context.beginPath();
          context.moveTo(from.x, from.y);
          context.lineTo(to.x, to.y);
          context.stroke();
        });
        context.restore();
      }

      drawFlowLayer(overpassFlow);

      const drawEndpoint = (point: Point, color: string) => {
        context.shadowBlur = 0;
        context.fillStyle = color;
        context.strokeStyle = surfaceColor;
        context.lineWidth = 4;
        context.beginPath();
        context.arc(point.x, point.y, cellWidth * TERMINAL_RADIUS_RATIO, 0, Math.PI * 2);
        context.fill();
        context.stroke();
      };
      drawEndpoint(geometry.startPoint, start);
      drawEndpoint(geometry.endPoint, end);

      if (celebration !== null) {
        drawTracksCelebration(
          {
            context,
            cellWidth,
            cellHeight: cellWidth,
            progress: celebration,
            color: cssVar(host, "--flow-bright", "#a68348"),
          },
          buildRoute(board, puzzle, cellWidth, cellWidth),
        );
      }

      context.restore();
    },
    [board, celebration, geometry, particleDefinition, particleImage, puzzle, solutionShown],
  );

  return (
    <CanvasBoard
      className="board"
      ariaLabel={`${puzzle.size} by ${puzzle.size} Tracks board`}
      rows={puzzle.size}
      cols={puzzle.size}
      cells={cells}
      assetUrls={withSurfaceAssets(assetUrls, surface)}
      hud={hud && surface?.hud ? { ...hud, style: surface.hud } : hud}
      draw={draw}
      animate={animate}
      animationFps={30}
      onCellActivate={onActivate}
      onCellWheel={onWheelRotate}
    />
  );
}
