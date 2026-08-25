import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueensPatternsSetting } from "@/features/settings/useConfig";
import { useWinSequence } from "@/shared/useWinSequence";
import type { BoardSurface } from "@/features/skins/skins";
import type { CanvasBoardHud, CanvasBoardPointer, CanvasCellPosition } from "@/shared/canvas/CanvasBoard";
import { evaluateGame, getForbiddenMarks, parsePositionKey, positionKey } from "@/games/queens/game";
import { QueensCanvas } from "@/games/queens/QueensCanvas";
import type { Placement } from "./protocol";

/**
 * The player's own board during a race.
 *
 * It is the single-player Queens board minus everything requirement 8 removes:
 * there is no hint, no solution reveal, and no new-game control, and no code
 * path here can produce one - the solution is never sent to this client in the
 * first place, so there is nothing to reveal even by accident.
 *
 * Input is refused while `locked`, which covers both the 3-second countdown
 * before a round (requirement 9) and the moment after a solve is accepted.
 */
export function RaceBoard({
  board,
  marker,
  surface,
  locked,
  autoMark,
  roundKey,
  onPlacementsChange,
  onCelebrationEnd,
  hud,
}: {
  board: number[][];
  marker: string;
  surface?: BoardSurface;
  locked: boolean;
  autoMark: boolean;
  /** Changing this clears the board: a new round starts empty. */
  roundKey: number;
  onPlacementsChange: (placements: readonly Placement[], isSolved: boolean) => void;
  /** Fires once the solve animation has played out and the stage can move on. */
  onCelebrationEnd?: () => void;
  hud: CanvasBoardHud;
}) {
  const [queens, setQueens] = useState<Set<string>>(() => new Set());
  const [manualMarks, setManualMarks] = useState<Set<string>>(() => new Set());
  const [showPatterns] = useQueensPatternsSetting();
  const longPressTimer = useRef<number | null>(null);
  const suppressClickKey = useRef<string | null>(null);
  const isMarkDragging = useRef(false);
  const markDragMode = useRef<"add" | "remove" | null>(null);
  const draggedMarkKeys = useRef<Set<string>>(new Set());
  const suppressNextContextMenu = useRef(false);

  useEffect(() => {
    setQueens(new Set());
    setManualMarks(new Set());
  }, [roundKey]);

  const status = useMemo(() => evaluateGame(board, queens), [board, queens]);
  const forbidden = useMemo(
    () => (autoMark ? getForbiddenMarks(board, queens) : new Set<string>()),
    [autoMark, board, queens],
  );
  const marks = useMemo(() => {
    const next = new Set([...manualMarks, ...forbidden]);
    for (const queen of queens) {
      next.delete(queen);
    }
    return next;
  }, [forbidden, manualMarks, queens]);

  const placements = useMemo<readonly Placement[]>(
    () => [...queens].map((key) => parsePositionKey(key)),
    [queens],
  );

  const notify = useRef(onPlacementsChange);
  notify.current = onPlacementsChange;
  useEffect(() => {
    notify.current(placements, status.isSolved);
  }, [placements, status.isSolved]);

  // The same celebration the single-player board plays. It runs off the local
  // solve rather than the server's acknowledgement so it starts on the click
  // that finished the board; the server validates the identical position, so
  // the two never disagree about whether it was solved.
  const win = useWinSequence({ solved: status.isSolved, runKey: roundKey });
  const celebrationEnded = useRef(onCelebrationEnd);
  celebrationEnded.current = onCelebrationEnd;
  useEffect(() => {
    if (win.isRevealed) {
      celebrationEnded.current?.();
    }
  }, [win.isRevealed]);

  const toggleQueen = useCallback(
    (row: number, col: number) => {
      if (locked) {
        return;
      }
      const key = positionKey(row, col);
      setQueens((current) => {
        const next = new Set(current);
        if (next.has(key)) {
          next.delete(key);
        } else {
          next.add(key);
          setManualMarks((currentMarks) => {
            const nextMarks = new Set(currentMarks);
            nextMarks.delete(key);
            return nextMarks;
          });
        }
        return next;
      });
    },
    [locked],
  );

  const toggleMark = useCallback(
    (row: number, col: number) => {
      if (locked) {
        return;
      }
      const key = positionKey(row, col);
      setQueens((current) => {
        if (!current.has(key)) {
          return current;
        }
        const next = new Set(current);
        next.delete(key);
        return next;
      });
      setManualMarks((current) => {
        const next = new Set(current);
        if (next.has(key)) {
          next.delete(key);
        } else {
          next.add(key);
        }
        return next;
      });
    },
    [locked],
  );

  const setCellMark = useCallback(
    (row: number, col: number, shouldMark: boolean) => {
      if (locked) {
        return;
      }
      const key = positionKey(row, col);
      setQueens((current) => {
        if (!current.has(key)) {
          return current;
        }
        const next = new Set(current);
        next.delete(key);
        return next;
      });
      setManualMarks((current) => {
        if (shouldMark === current.has(key)) {
          return current;
        }
        const next = new Set(current);
        if (shouldMark) {
          next.add(key);
        } else {
          next.delete(key);
        }
        return next;
      });
    },
    [locked],
  );

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimer.current !== null) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const finishMarkDrag = useCallback(() => {
    isMarkDragging.current = false;
    markDragMode.current = null;
    draggedMarkKeys.current.clear();
  }, []);

  useEffect(() => {
    window.addEventListener("pointerup", finishMarkDrag);
    window.addEventListener("blur", finishMarkDrag);
    return () => {
      window.removeEventListener("pointerup", finishMarkDrag);
      window.removeEventListener("blur", finishMarkDrag);
    };
  }, [finishMarkDrag]);

  useEffect(() => clearLongPressTimer, [clearLongPressTimer]);

  function paintDraggedMark(row: number, col: number): void {
    if (!markDragMode.current) {
      return;
    }
    const key = positionKey(row, col);
    if (draggedMarkKeys.current.has(key)) {
      return;
    }
    draggedMarkKeys.current.add(key);
    setCellMark(row, col, markDragMode.current === "add");
  }

  function handlePointerDown(pointer: CanvasBoardPointer): void {
    const { event, row, col } = pointer;
    if (event.pointerType === "mouse" && event.button === 2) {
      event.preventDefault();
      clearLongPressTimer();
      isMarkDragging.current = true;
      suppressNextContextMenu.current = true;
      draggedMarkKeys.current = new Set();
      markDragMode.current = manualMarks.has(positionKey(row, col)) ? "remove" : "add";
      paintDraggedMark(row, col);
      return;
    }

    if (event.pointerType === "mouse") {
      return;
    }

    clearLongPressTimer();
    const key = positionKey(row, col);
    longPressTimer.current = window.setTimeout(() => {
      toggleMark(row, col);
      suppressClickKey.current = key;
      longPressTimer.current = null;
    }, 520);
  }

  function handlePointerMove(pointer: CanvasBoardPointer): void {
    const { event, row, col } = pointer;
    if (!isMarkDragging.current || event.pointerType !== "mouse") {
      return;
    }
    event.preventDefault();
    paintDraggedMark(row, col);
  }

  function handleActivate({ row, col }: CanvasCellPosition): void {
    const key = positionKey(row, col);
    if (suppressClickKey.current === key) {
      suppressClickKey.current = null;
      return;
    }
    toggleQueen(row, col);
  }

  function handleContextMenu({ row, col }: CanvasCellPosition): void {
    if (suppressNextContextMenu.current) {
      suppressNextContextMenu.current = false;
      return;
    }
    const key = positionKey(row, col);
    if (suppressClickKey.current === key) {
      suppressClickKey.current = null;
      return;
    }
    toggleMark(row, col);
  }

  return (
    <QueensCanvas
      celebration={win.isCelebrating ? win.progress : null}
      board={board}
      marker={marker}
      surface={surface}
      queens={queens}
      marks={marks}
      conflicts={status.conflicts}
      conflictHints={new Set()}
      solutionCells={EMPTY_SET}
      showSolution={false}
      showPatterns={showPatterns}
      hud={hud}
      onActivate={handleActivate}
      onContextMenu={handleContextMenu}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={clearLongPressTimer}
      onPointerCancel={() => {
        clearLongPressTimer();
        finishMarkDrag();
      }}
    />
  );
}

/** There is no solution to draw in multiplayer, and never will be one. */
const EMPTY_SET: ReadonlySet<string> = new Set();
