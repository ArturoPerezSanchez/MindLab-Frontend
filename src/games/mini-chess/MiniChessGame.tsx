import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  AlertTriangle,
  ChevronDown,
  CircleHelp,
  Lightbulb,
  LoaderCircle,
  PartyPopper,
  RefreshCcw,
  RotateCcw,
  Trophy,
  X,
} from "lucide-react";
import { useGameResultReporter } from "@/features/auth/AuthProvider";
import { LeaderboardLink } from "@/features/leaderboard/LeaderboardLink";
import { useGameSkin } from "@/features/skins/useSkins";
import { useRevealedSolution } from "@/shared/useRevealedSolution";
import { useWinSequence } from "@/shared/useWinSequence";
import { pieceSymbolUrl } from "./pieceSources";
import type { CanvasBoardPointer } from "@/shared/canvas/CanvasBoard";
import { fetchPuzzle, submitMove } from "./api";
import {
  boardSquares,
  completedSolverMoves,
  formatTime,
  legalTargets,
  parseFen,
  sideLabel,
} from "./game";
import { MiniChessCanvas, type CanvasDragPreview } from "./MiniChessCanvas";
import type {
  BoardPiece,
  BoardSize,
  LastMove,
  Puzzle,
  PuzzleState,
  SolutionMove,
  SquareId,
} from "./types";

const CONFETTI_COLORS = ["#c6943b", "#47796d", "#cf5b4c", "#385b73", "#efe1c4"];

type PointerDrag = {
  active: boolean;
  pointerId: number;
  square: SquareId;
  piece: BoardPiece;
  startX: number;
  startY: number;
};

type PointerPress = {
  moved: boolean;
  pointerId: number;
  square: SquareId;
  startX: number;
  startY: number;
};

function getStoredBestTime(puzzle: Puzzle): number | null {
  const current = window.localStorage.getItem(`mini-chess-best-${puzzle.boardWidth}`);
  if (current) {
    return Number(current);
  }

  const legacyTimes = [1, 2, 3]
    .map((mateIn) => window.localStorage.getItem(`mini-chess-best-${puzzle.variant}-${mateIn}`))
    .filter((value): value is string => value !== null)
    .map(Number);
  if (legacyTimes.length === 0) {
    return null;
  }

  const migrated = Math.min(...legacyTimes);
  window.localStorage.setItem(`mini-chess-best-${puzzle.boardWidth}`, String(migrated));
  return migrated;
}

export function MiniChessGame() {
  const skin = useGameSkin("mini-chess");
  const [selectedSize, setSelectedSize] = useState<BoardSize>(8);
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [states, setStates] = useState<PuzzleState[]>([]);
  const [movesPlayed, setMovesPlayed] = useState(0);
  const [solved, setSolved] = useState(false);
  const [selectedSquare, setSelectedSquare] = useState<SquareId | null>(null);
  const [draggingSquare, setDraggingSquare] = useState<SquareId | null>(null);
  const [dragPreview, setDragPreview] = useState<CanvasDragPreview | null>(null);
  const [lastMove, setLastMove] = useState<LastMove | null>(null);
  const [wrongSquare, setWrongSquare] = useState<SquareId | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [bestTime, setBestTime] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isResponding, setIsResponding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showRules, setShowRules] = useState(false);
  const [usedHint, setUsedHint] = useState(false);
  const [madeMistake, setMadeMistake] = useState(false);

  const requestSequenceRef = useRef(0);
  const replySequenceRef = useRef(0);
  const replyTimerRef = useRef<number | null>(null);
  const wrongTimerRef = useRef<number | null>(null);
  const pointerDragRef = useRef<PointerDrag | null>(null);
  const pointerPressRef = useRef<PointerPress | null>(null);

  const currentState = states.at(-1) ?? null;
  const pieces = useMemo(
    () => (currentState && puzzle ? parseFen(currentState.fen, puzzle.boardHeight) : new Map()),
    [currentState, puzzle],
  );
  const assisted = usedHint || madeMistake;
  const isNewBest = solved && !assisted && (bestTime === null || elapsedSeconds < bestTime);
  const displayedBestTime = isNewBest ? elapsedSeconds : bestTime;
  const completedMoves = completedSolverMoves(movesPlayed);
  const progress = puzzle ? Math.min(100, (completedMoves / puzzle.mateIn) * 100) : 0;
  const orientation = puzzle?.sideToMove ?? "white";
  const squares = useMemo(
    () => boardSquares(orientation, puzzle?.boardWidth ?? 8, puzzle?.boardHeight ?? 8),
    [orientation, puzzle?.boardHeight, puzzle?.boardWidth],
  );
  const targets = useMemo(
    () => legalTargets(currentState, selectedSquare),
    [currentState, selectedSquare],
  );
  const checkSquare = currentState?.checkSquare ?? null;
  const {
    solution: revealedLine,
    reveal: revealLine,
    isRevealing: isRevealingLine,
    error: revealError,
  } = useRevealedSolution<SolutionMove[]>(
    "mini-chess",
    puzzle ? `${puzzle.boardWidth}x${puzzle.boardHeight}` : `${selectedSize}x${selectedSize}`,
    puzzle,
  );
  const win = useWinSequence({ solved, runKey: puzzle });

  useGameResultReporter({
    runKey: puzzle,
    completed: solved,
    game: "mini-chess",
    difficulty: puzzle ? `${puzzle.boardWidth}x${puzzle.boardHeight}` : `${selectedSize}x${selectedSize}`,
    time_seconds: elapsedSeconds,
  });

  const stopPendingActions = useCallback(() => {
    replySequenceRef.current += 1;
    window.clearTimeout(replyTimerRef.current ?? undefined);
    window.clearTimeout(wrongTimerRef.current ?? undefined);
    replyTimerRef.current = null;
    wrongTimerRef.current = null;
  }, []);

  const initializePuzzle = useCallback(
    (nextPuzzle: Puzzle) => {
      stopPendingActions();
      setSelectedSize(nextPuzzle.boardWidth as BoardSize);
      setPuzzle(nextPuzzle);
      setStates(nextPuzzle.states);
      setMovesPlayed(0);
      setSolved(false);
      setSelectedSquare(null);
      setDraggingSquare(null);
      setDragPreview(null);
      setLastMove(null);
      setWrongSquare(null);
      setElapsedSeconds(0);
      setIsResponding(false);
      setFeedback(null);
      setUsedHint(false);
      setMadeMistake(false);
      setBestTime(getStoredBestTime(nextPuzzle));
    },
    [stopPendingActions],
  );

  const loadPuzzle = useCallback(
    async (size: BoardSize, signal?: AbortSignal) => {
      const requestSequence = ++requestSequenceRef.current;
      stopPendingActions();
      setIsLoading(true);
      setError(null);
      setPuzzle(null);

      try {
        const nextPuzzle = await fetchPuzzle(size, signal);
        if (requestSequence === requestSequenceRef.current) {
          initializePuzzle(nextPuzzle);
        }
      } catch (requestError) {
        if (!signal?.aborted && requestSequence === requestSequenceRef.current) {
          setError(requestError instanceof Error ? requestError.message : "Could not load a MiniChess puzzle.");
        }
      } finally {
        if (!signal?.aborted && requestSequence === requestSequenceRef.current) {
          setIsLoading(false);
        }
      }
    },
    [initializePuzzle, stopPendingActions],
  );

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      void loadPuzzle(8, controller.signal);
    }, 0);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
      stopPendingActions();
    };
  }, [loadPuzzle, stopPendingActions]);

  useEffect(() => {
    if (!puzzle || isLoading || solved) {
      return;
    }
    const timer = window.setInterval(() => {
      setElapsedSeconds((current) => current + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isLoading, puzzle, solved]);

  useEffect(() => {
    if (!isNewBest || !puzzle) {
      return;
    }
    window.localStorage.setItem(
      `mini-chess-best-${puzzle.boardWidth}`,
      String(elapsedSeconds),
    );
  }, [elapsedSeconds, isNewBest, puzzle]);

  const showWrongMove = (square: SquareId, message: string, countsAsMistake: boolean) => {
    window.clearTimeout(wrongTimerRef.current ?? undefined);
    setWrongSquare(square);
    setFeedback(message);
    if (countsAsMistake) {
      setMadeMistake(true);
    }
    wrongTimerRef.current = window.setTimeout(() => {
      setWrongSquare(null);
      setFeedback(null);
    }, 1100);
  };

  const playSolverMove = async (from: SquareId, to: SquareId, fromHint = false) => {
    if (!puzzle || !currentState || solved || isResponding) {
      return;
    }

    if (fromHint) {
      setUsedHint(true);
    }
    setSelectedSquare(null);
    setFeedback(null);
    setIsResponding(true);

    const sequence = ++replySequenceRef.current;
    try {
      const result = await submitMove(puzzle.puzzleHandle, {
        from,
        to,
        promotion: null,
      });
      if (sequence !== replySequenceRef.current) {
        return;
      }

      if (!result.accepted) {
        setIsResponding(false);
        showWrongMove(to, "That move does not force the mate.", true);
        return;
      }

      const [afterPlayer, afterReply] = result.states;
      setStates((current) => [...current, afterPlayer]);
      setLastMove({ from, to });

      const finish = () => {
        if (sequence !== replySequenceRef.current) {
          return;
        }
        if (afterReply) {
          setStates((current) => [...current, afterReply]);
        }
        if (result.reply) {
          setLastMove({ from: result.reply.from, to: result.reply.to });
        }
        setMovesPlayed(result.movesPlayed);
        setSolved(result.solved);
        setIsResponding(false);
        setFeedback(null);
      };

      if (afterReply && result.reply) {
        setFeedback(`${sideLabel(afterPlayer.turn)} is replying`);
        replyTimerRef.current = window.setTimeout(finish, 520);
      } else {
        finish();
      }
    } catch (cause) {
      if (sequence === replySequenceRef.current) {
        setIsResponding(false);
        setFeedback(cause instanceof Error ? cause.message : "Could not validate that move.");
      }
    }
  };

  const selectOrMove = (square: SquareId) => {
    if (!currentState || !puzzle || solved || isResponding) {
      return;
    }

    const piece = pieces.get(square);
    const movingColor = currentState.turn === "white" ? "w" : "b";
    if (!selectedSquare) {
      if (piece?.color === movingColor) {
        setSelectedSquare(square);
        setFeedback(null);
      } else {
        showWrongMove(square, `Choose a ${sideLabel(puzzle.sideToMove)} piece.`, false);
      }
      return;
    }

    if (square === selectedSquare) {
      setSelectedSquare(null);
      setFeedback(null);
      return;
    }

    if (targets.has(square)) {
      void playSolverMove(selectedSquare, square);
      return;
    }

    if (piece?.color === movingColor) {
      setSelectedSquare(square);
      setFeedback(null);
      return;
    }

    showWrongMove(square, "That piece cannot move there.", false);
  };

  const beginPointerDrag = ({ event, row, col }: CanvasBoardPointer) => {
    const square = squares[row * (puzzle?.boardWidth ?? selectedSize) + col];
    if (event.button !== 0 || !currentState || !puzzle || solved || isResponding) {
      return;
    }

    pointerPressRef.current = {
      moved: false,
      pointerId: event.pointerId,
      square,
      startX: event.clientX,
      startY: event.clientY,
    };

    const piece = pieces.get(square);
    const movingColor = currentState.turn === "white" ? "w" : "b";
    if (piece?.color !== movingColor) {
      return;
    }

    pointerDragRef.current = {
      active: false,
      pointerId: event.pointerId,
      square,
      piece,
      startX: event.clientX,
      startY: event.clientY,
    };
  };

  const movePointerDrag = ({ event, x, y }: CanvasBoardPointer) => {
    const press = pointerPressRef.current;
    if (
      press &&
      press.pointerId === event.pointerId &&
      !press.moved &&
      Math.hypot(event.clientX - press.startX, event.clientY - press.startY) >= 7
    ) {
      press.moved = true;
    }

    const drag = pointerDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    if (!drag.active && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) >= 7) {
      drag.active = true;
      setSelectedSquare(drag.square);
      setDraggingSquare(drag.square);
      setFeedback(null);
    }

    if (drag.active) {
      setDragPreview({
        piece: drag.piece,
        x,
        y,
      });
    }
  };

  const endPointerDrag = ({ event, row, col }: CanvasBoardPointer) => {
    const press = pointerPressRef.current;
    const drag = pointerDragRef.current;
    pointerPressRef.current = null;
    pointerDragRef.current = null;
    const square = squares[row * (puzzle?.boardWidth ?? selectedSize) + col];

    if (!press || press.pointerId !== event.pointerId) {
      setDraggingSquare(null);
      setDragPreview(null);
      return;
    }

    if (!drag?.active || drag.pointerId !== event.pointerId) {
      setDraggingSquare(null);
      setDragPreview(null);
      if (!press.moved && square === press.square) {
        selectOrMove(square);
      }
      return;
    }

    setDraggingSquare(null);
    setDragPreview(null);

    if (!currentState || !legalTargets(currentState, drag.square).has(square)) {
      setSelectedSquare(null);
      showWrongMove(square ?? drag.square, "That piece cannot move there.", false);
      return;
    }

    void playSolverMove(drag.square, square);
  };

  const cancelPointerDrag = () => {
    pointerPressRef.current = null;
    pointerDragRef.current = null;
    setDraggingSquare(null);
    setDragPreview(null);
  };

  const retry = () => {
    // The server has already advanced the line, so retrying needs a new handle.
    void loadPuzzle(selectedSize);
  };

  const hint = async () => {
    if (!puzzle || solved || isResponding || isRevealingLine) {
      return;
    }
    const line = revealedLine ?? (await revealLine());
    const expected = line?.[movesPlayed];
    if (expected) {
      await playSolverMove(expected.from, expected.to, true);
    }
  };

  const changeSize = (size: BoardSize) => {
    setSelectedSize(size);
    void loadPuzzle(size);
  };

  const statusMessage = solved
    ? "Checkmate"
    : feedback || revealError
      ? feedback || revealError
      : puzzle
        ? `${sideLabel(puzzle.sideToMove)} to move`
        : "";

  return (
    <main className="app-shell">
      <section className="game-surface" aria-label="MiniChess game">
        <header className="top-bar">
          <div className="brand-lockup">
            <span className="brand-mark chess-brand-mark" aria-hidden="true">
              <img
                src={pieceSymbolUrl(skin.assets.pieces, "b", "n")}
                alt=""
              />
            </span>
            <h1>MiniChess</h1>
          </div>

          <div className="top-actions">
            <label className="size-control">
              <span className="sr-only">Board size</span>
              <select
                value={selectedSize}
                onChange={(event) => changeSize(Number(event.target.value) as BoardSize)}
                disabled={isLoading}
              >
                <option value={5}>5 x 5</option>
                <option value={8}>8 x 8</option>
              </select>
              <ChevronDown aria-hidden="true" size={16} />
            </label>
            <button
              className="icon-action"
              type="button"
              aria-label="Open game rules"
              aria-expanded={showRules}
              onClick={() => setShowRules(true)}
              title="Rules"
            >
              <CircleHelp aria-hidden="true" size={21} />
            </button>
          </div>
        </header>

        <div className="stats-bar sr-only" aria-label="Game progress">
          <div className="stat">
            <span>Timer</span>
            <strong>{formatTime(elapsedSeconds)}</strong>
          </div>
          <div className="stat">
            <span>Best</span>
            <strong>{displayedBestTime === null ? "--:--" : formatTime(displayedBestTime)}</strong>
          </div>
          <div className="stat">
            <span>Line</span>
            <strong>
              {completedMoves}/{puzzle?.mateIn ?? "-"}
            </strong>
          </div>
        </div>

        <div className="board-zone">
          {isLoading ? (
            <div className="state-panel" role="status">
              <LoaderCircle className="spin" aria-hidden="true" size={30} />
              <strong>Setting the position</strong>
            </div>
          ) : error || !puzzle || !currentState ? (
            <div className="state-panel error-state" role="alert">
              <AlertTriangle aria-hidden="true" size={30} />
              <strong>Could not load the puzzle</strong>
              <p>{error}</p>
              <button className="primary-action" type="button" onClick={() => void loadPuzzle(selectedSize)}>
                <RefreshCcw aria-hidden="true" size={18} />
                Try again
              </button>
            </div>
          ) : (
            <>
              <div className="position-strip" aria-live="polite">
                <span className={`side-dot ${puzzle.sideToMove}`} aria-hidden="true" />
                <strong>{statusMessage}</strong>
                <span>Mate in {puzzle.mateIn}</span>
              </div>

              <MiniChessCanvas
                surface={skin.assets.surface}
                width={puzzle.boardWidth}
                height={puzzle.boardHeight}
                orientation={orientation}
                squares={squares}
                pieces={pieces}
                pieceSources={skin.assets.pieces}
                selectedSquare={selectedSquare}
                targets={targets}
                lastMove={lastMove}
                checkSquare={checkSquare}
                wrongSquare={wrongSquare}
                draggingSquare={draggingSquare}
                dragPreview={dragPreview}
                disabled={solved || isResponding}
                hud={{
                  metrics: [
                    { label: "Timer", value: formatTime(elapsedSeconds) },
                    {
                      label: "Best",
                      value: displayedBestTime === null ? "--:--" : formatTime(displayedBestTime),
                    },
                    { label: "Line", value: `${completedMoves}/${puzzle.mateIn}` },
                  ],
                }}
                ariaLabel={`${puzzle.boardWidth} by ${puzzle.boardHeight} MiniChess board, ${sideLabel(puzzle.sideToMove)} to move and mate in ${puzzle.mateIn}`}
                onActivate={({ row, col }) => selectOrMove(squares[row * puzzle.boardWidth + col])}
                onPointerDown={beginPointerDrag}
                onPointerMove={movePointerDrag}
                onPointerUp={endPointerDrag}
                onPointerCancel={cancelPointerDrag}
              />

              {win.isRevealed && (
                <div className="board-popup win-popup" role="dialog" aria-modal="true" aria-label="Puzzle solved">
                  <div className="confetti-field" aria-hidden="true">
                    {Array.from({ length: 18 }, (_, index) => (
                      <span
                        key={index}
                        style={
                          {
                            "--x": `${6 + ((index * 17) % 89)}%`,
                            "--delay": `${(index % 7) * 45}ms`,
                            "--confetti-color": CONFETTI_COLORS[index % CONFETTI_COLORS.length],
                          } as CSSProperties
                        }
                      />
                    ))}
                  </div>
                  <PartyPopper aria-hidden="true" size={28} />
                  <div>
                    <strong>Checkmate!</strong>
                    <p>
                      {assisted
                        ? "Solved with help, so this run is not saved as a record."
                        : `You found the line in ${formatTime(elapsedSeconds)}.`}
                    </p>
                  </div>
                  {isNewBest && (
                    <span className="record-badge">
                      <Trophy aria-hidden="true" size={15} />
                      New best
                    </span>
                  )}
                  <LeaderboardLink game="mini-chess" difficulty={`${selectedSize}x${selectedSize}`} />
                  <button className="win-action" type="button" onClick={() => void loadPuzzle(selectedSize)}>
                    <RefreshCcw aria-hidden="true" size={18} />
                    Next puzzle
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <div className="progress-track" aria-hidden="true">
          <span style={{ width: `${progress}%` }} />
        </div>

        <div className="action-row" aria-label="Game controls">
          <button className="secondary-action" type="button" onClick={retry} disabled={!puzzle || isLoading}>
            <RotateCcw aria-hidden="true" size={18} />
            Retry
          </button>
          <button
            className="secondary-action"
            type="button"
            onClick={() => void hint()}
            disabled={!puzzle || isLoading || solved || isResponding || isRevealingLine}
          >
            <Lightbulb aria-hidden="true" size={18} />
            Hint
          </button>
          <button className="primary-action" type="button" onClick={() => void loadPuzzle(selectedSize)} disabled={isLoading}>
            <RefreshCcw aria-hidden="true" size={18} />
            New puzzle
          </button>
        </div>

        <p className="sr-only" aria-live="polite">
          {solved ? `Checkmate found in ${formatTime(elapsedSeconds)}` : statusMessage}
        </p>
      </section>

      {showRules && (
        <>
          <button className="rules-backdrop" type="button" aria-label="Close game rules" onClick={() => setShowRules(false)} />
          <aside className="rules-panel" aria-label="How to play MiniChess">
            <div className="rules-heading">
              <div>
                <span>How to play</span>
                <h2>MiniChess rules</h2>
              </div>
              <button className="icon-action" type="button" aria-label="Close game rules" onClick={() => setShowRules(false)}>
                <X aria-hidden="true" size={20} />
              </button>
            </div>

            <div className="piece-lineup" aria-hidden="true">
              {(["k", "q", "r", "b", "n", "p"] as const).map((piece) => (
                <img
                  key={piece}
                  src={pieceSymbolUrl(skin.assets.pieces, "w", piece)}
                  alt=""
                />
              ))}
            </div>

            <ol className="rules-list">
              <li>
                <strong>Find the forced checkmate</strong>
                <span>The side shown below the board moves first. Pieces use their familiar chess moves.</span>
              </li>
              <li>
                <strong>Select, then move</strong>
                <span>Click a piece and its destination, or drag it to a highlighted legal square.</span>
              </li>
              <li>
                <strong>Continue the tactic</strong>
                <span>Your opponent replies automatically. Find each move until the king is checkmated.</span>
              </li>
              <li>
                <strong>Hints play one move</strong>
                <span>A hint makes the next move for you and makes the current run ineligible for a best time.</span>
              </li>
              <li>
                <strong>Gardner boards are 5 by 5</strong>
                <span>Pawns move one square at a time, and there is no castling.</span>
              </li>
            </ol>
          </aside>
        </>
      )}
    </main>
  );
}
