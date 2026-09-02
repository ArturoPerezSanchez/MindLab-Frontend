export type Position = readonly [row: number, col: number];
export type Board = number[][];

export type TracksResponse = {
  board_size: number;
  board: Board;
  start: [number, number];
  end: [number, number];
};

export type Puzzle = {
  size: number;
  board: Board;
  start: Position;
  end: Position;
};
