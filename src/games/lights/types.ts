export type Position = readonly [row: number, col: number];
export type Board = number[][];

export type LightsResponse = {
  board_size: number;
  board: Board;
};

/** The answer is not here: the client solves Lights itself when asked. */
export type Puzzle = {
  size: number;
  board: Board;
};
