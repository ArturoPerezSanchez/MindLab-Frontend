import { apiPath } from "@/shared/api";
import { rememberPuzzleHandleFrom, squareDifficulty } from "@/shared/puzzleHandles";
import { playMiniChessMove } from "@/shared/gamesApi";
import type {
  BoardSize,
  MiniChessResponse,
  Puzzle,
  PuzzleState,
  SolutionMove,
} from "./types";

const API_PATH = apiPath("/mini-chess");

type RawState = MiniChessResponse["states"][number];

function mapState(state: RawState): PuzzleState {
  return {
    fen: state.fen,
    turn: state.turn,
    legalMoves: state.legal_moves,
    checkSquare: state.check_square,
    isCheckmate: state.is_checkmate,
  };
}

function isOpeningState(value: unknown): value is RawState {
  if (!value || typeof value !== "object") {
    return false;
  }
  const state = value as Partial<RawState>;
  return (
    typeof state.fen === "string" &&
    (state.turn === "white" || state.turn === "black") &&
    Array.isArray(state.legal_moves) &&
    typeof state.is_checkmate === "boolean"
  );
}

export async function fetchPuzzle(boardSize: BoardSize, signal?: AbortSignal): Promise<Puzzle> {
  const params = new URLSearchParams({ board_size: String(boardSize) });
  const response = await fetch(`${API_PATH}?${params}`, { signal });

  if (!response.ok) {
    throw new Error(`Puzzle generation failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as MiniChessResponse;
  if (
    payload.board_width !== boardSize ||
    payload.board_height !== boardSize ||
    payload.states.length !== 1 ||
    !isOpeningState(payload.states[0]) ||
    payload.states[0].is_checkmate ||
    typeof payload.puzzle_handle !== "string"
  ) {
    throw new Error("The API returned an invalid MiniChess puzzle.");
  }

  rememberPuzzleHandleFrom("mini-chess", squareDifficulty(boardSize), payload);

  return {
    id: payload.id,
    variant: payload.variant,
    boardWidth: payload.board_width,
    boardHeight: payload.board_height,
    fen: payload.fen,
    mateIn: payload.mate_in,
    sideToMove: payload.side_to_move,
    pieceCount: payload.piece_count,
    rating: payload.rating,
    puzzleHandle: payload.puzzle_handle,
    states: payload.states.map(mapState),
  };
}

export type PlayedMove = {
  accepted: boolean;
  reply: SolutionMove | null;
  states: PuzzleState[];
  solved: boolean;
  movesPlayed: number;
};

export async function submitMove(
  puzzleHandle: string,
  move: Pick<SolutionMove, "from" | "to" | "promotion">,
): Promise<PlayedMove> {
  const response = await playMiniChessMove(puzzleHandle, move);
  const states = response.states.filter(isOpeningState).map(mapState);
  if (response.accepted && states.length === 0) {
    throw new Error("The API accepted the move without returning the next position.");
  }
  return {
    accepted: response.accepted,
    reply: response.reply as SolutionMove | null,
    states,
    solved: response.solved,
    movesPlayed: response.moves_played,
  };
}
