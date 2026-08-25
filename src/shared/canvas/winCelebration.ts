import { easeOut, staggeredProgress } from "@/shared/useWinSequence";

/**
 * Celebration overlays played on a solved board before the win popup.
 *
 * These are deliberately plain 2D canvas passes with no dependency on
 * CanvasBoard itself: a game calls the one it wants from its existing
 * `animate` callback, so games that have not adopted this yet are unaffected.
 *
 * Every function takes `progress` in 0..1 from `useWinSequence`, so timing
 * lives in one place and the drawing stays stateless.
 */

export type CellRef = { row: number; col: number };

type Frame = {
  context: CanvasRenderingContext2D;
  cellWidth: number;
  cellHeight: number;
  progress: number;
  color: string;
};

function cellCentre(cell: CellRef, cellWidth: number, cellHeight: number) {
  return {
    x: (cell.col + 0.5) * cellWidth,
    y: (cell.row + 0.5) * cellHeight,
  };
}

/**
 * Queens: every queen swells and settles back, twice.
 *
 * The marker is redrawn over the static one rather than the board being
 * repainted, so the scale never drops below 1 - shrinking past that would let
 * the sprite underneath peek out around the edges.
 */
export function drawQueensCelebration(
  {
    context,
    cellWidth,
    cellHeight,
    progress,
  }: Omit<Frame, "color">,
  queens: readonly CellRef[],
  marker: HTMLImageElement,
  baseScale = 0.62,
): void {
  if (queens.length === 0 || !marker.complete || marker.naturalWidth === 0) {
    return;
  }

  // Two full beats across the sequence, easing out so the last one lands soft.
  const beats = Math.sin(progress * Math.PI * 4);
  const swell = 1 + Math.max(0, beats) * 0.42 * (1 - progress * 0.35);
  const size = cellWidth * baseScale * swell;

  context.save();
  queens.forEach((queen) => {
    const { x, y } = cellCentre(queen, cellWidth, cellHeight);
    context.drawImage(marker, x - size / 2, y - size / 2, size, size);
  });
  context.restore();
}

/**
 * Tango: one group lights, then the other a beat later.
 *
 * `offset` shifts a group's slice of the timeline, which is how the moons get
 * their moment before the suns answer.
 */
export function drawTangoCelebration(
  { context, cellWidth, cellHeight, progress, color }: Frame,
  cells: readonly CellRef[],
  offset: number,
): void {
  if (cells.length === 0) {
    return;
  }

  const local = Math.max(0, Math.min(1, (progress - offset) / (1 - offset)));
  if (local <= 0) {
    return;
  }

  const eased = easeOut(local);
  const fade = local < 0.65 ? 1 : 1 - (local - 0.65) / 0.35;

  context.save();
  context.globalAlpha = 0.42 * fade;
  context.fillStyle = color;
  cells.forEach((cell) => {
    const { x, y } = cellCentre(cell, cellWidth, cellHeight);
    const size = cellWidth * 0.86 * eased;
    context.beginPath();
    context.roundRect(x - size / 2, y - size / 2, size, size, cellWidth * 0.12);
    context.fill();
  });
  context.restore();
}

/**
 * Lights: a wave of glow crossing the board in whatever order the game chose.
 *
 * `orderOf` maps a cell to its position in the sweep, so the same renderer
 * serves left-to-right, diagonals, rings and scatter.
 */
export function drawLightsCelebration(
  { context, cellWidth, cellHeight, progress, color }: Frame,
  cells: readonly CellRef[],
  orderOf: (cell: CellRef) => number,
): void {
  if (cells.length === 0) {
    return;
  }

  const orders = cells.map(orderOf);
  const steps = Math.max(...orders) + 1;

  context.save();
  cells.forEach((cell, index) => {
    const local = staggeredProgress(progress, orders[index], steps, 0.35);
    if (local <= 0) {
      return;
    }
    // Each cell flares up then relaxes, so the wave has a visible crest.
    const flare = Math.sin(Math.min(1, local) * Math.PI);
    const { x, y } = cellCentre(cell, cellWidth, cellHeight);
    const radius = cellWidth * (0.3 + flare * 0.34);
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, "transparent");
    context.globalAlpha = 0.6 * flare;
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  });
  context.restore();
}

/**
 * Tracks: a bright head runs the whole route from start to end, trailing a
 * line behind it, so the finished path is drawn out rather than just lit.
 */
export function drawTracksCelebration(
  { context, cellWidth, progress, color }: Frame,
  points: readonly { x: number; y: number }[],
): void {
  if (points.length < 2) {
    return;
  }

  const lengths: number[] = [];
  let total = 0;
  for (let index = 1; index < points.length; index += 1) {
    const span = Math.hypot(
      points[index].x - points[index - 1].x,
      points[index].y - points[index - 1].y,
    );
    lengths.push(span);
    total += span;
  }

  const travelled = easeOut(progress) * total;
  context.save();
  context.lineCap = "round";
  context.lineJoin = "round";
  context.strokeStyle = color;
  context.shadowColor = color;
  context.shadowBlur = cellWidth * 0.16;
  context.lineWidth = cellWidth * 0.1;
  context.globalAlpha = 0.95;

  let covered = 0;
  let head = points[0];
  context.beginPath();
  context.moveTo(points[0].x, points[0].y);
  for (let index = 1; index < points.length; index += 1) {
    const span = lengths[index - 1];
    if (covered + span <= travelled) {
      context.lineTo(points[index].x, points[index].y);
      head = points[index];
      covered += span;
      continue;
    }
    const ratio = span === 0 ? 0 : (travelled - covered) / span;
    head = {
      x: points[index - 1].x + (points[index].x - points[index - 1].x) * ratio,
      y: points[index - 1].y + (points[index].y - points[index - 1].y) * ratio,
    };
    context.lineTo(head.x, head.y);
    break;
  }
  context.stroke();

  context.shadowBlur = cellWidth * 0.3;
  context.fillStyle = color;
  context.beginPath();
  context.arc(head.x, head.y, cellWidth * 0.09, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

/**
 * Mine Islands: a scan line crosses the board and leaves the hidden mines
 * showing faintly behind it, like sonar returning contacts.
 */
export function drawMinesCelebration(
  { context, cellWidth, cellHeight, progress, color }: Frame,
  mines: readonly CellRef[],
  cols: number,
  rows: number,
): void {
  const boardWidth = cols * cellWidth;
  const boardHeight = rows * cellHeight;
  const scanX = easeOut(progress) * boardWidth;

  context.save();

  mines.forEach((mine) => {
    const { x, y } = cellCentre(mine, cellWidth, cellHeight);
    if (x > scanX) {
      return;
    }
    // Contacts fade up as the beam passes and then hold, so the final frame
    // shows every mine at a steady, readable opacity.
    const since = Math.min(1, (scanX - x) / (cellWidth * 2));
    context.globalAlpha = 0.34 * since;
    context.fillStyle = color;
    context.beginPath();
    context.arc(x, y, cellWidth * 0.26, 0, Math.PI * 2);
    context.fill();

    context.globalAlpha = 0.5 * since;
    context.strokeStyle = color;
    context.lineWidth = Math.max(1.5, cellWidth * 0.03);
    context.beginPath();
    context.arc(x, y, cellWidth * 0.32, 0, Math.PI * 2);
    context.stroke();
  });

  if (progress < 1) {
    const beam = context.createLinearGradient(scanX - cellWidth, 0, scanX, 0);
    beam.addColorStop(0, "transparent");
    beam.addColorStop(1, color);
    context.globalAlpha = 0.5;
    context.fillStyle = beam;
    context.fillRect(scanX - cellWidth, 0, cellWidth, boardHeight);

    context.globalAlpha = 0.9;
    context.strokeStyle = color;
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(scanX, 0);
    context.lineTo(scanX, boardHeight);
    context.stroke();
  }

  context.restore();
}
