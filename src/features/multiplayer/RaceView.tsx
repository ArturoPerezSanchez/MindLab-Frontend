import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Crown,
  Eye,
  LogOut,
  ShieldX,
  Skull,
  Timer,
  WifiOff,
} from "lucide-react";
import { Avatar } from "@/features/profile/Avatar";
import { resolveGameSkin } from "@/features/skins/skins";
import { useGameSkin } from "@/features/skins/useSkins";
import { formatTime } from "@/games/queens/game";
import { ChatPanel } from "./ChatPanel";
import { EloChangeBadge } from "./EloChangeBadge";
import { PlayerBoard } from "./PlayerBoard";
import { RaceBoard } from "./RaceBoard";
import type { Placement, PlayerId, RoomPlayer } from "./protocol";
import {
  isEliminated,
  isInputLocked,
  secondsUntil,
  selfPlayer,
  spectatableIds,
  stepSpectatorTarget,
  type PlayerProgress,
  type RoomView,
} from "./roomState";

const AUTO_MARK_KEY = "queens-auto-mark";

/** The board clock is the server's, so it has to be re-read, not counted down. */
function useClockTick(active: boolean): void {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!active) {
      return;
    }
    const timer = window.setInterval(() => setTick((current) => current + 1), 200);
    return () => window.clearInterval(timer);
  }, [active]);
}

function statusLabel(player: RoomPlayer): string {
  if (!player.connected) {
    return "Left";
  }
  if (isEliminated(player)) {
    return "Out";
  }
  if (player.status === "finished") {
    return player.finishedInSeconds === null ? "Solved" : `${player.finishedInSeconds.toFixed(1)}s`;
  }
  return "Racing";
}

/**
 * A race in progress.
 *
 * The screen has two modes and makes a point of looking different in each. While
 * you are racing, your board fills the stage and the rail carries only *counts*
 * for your rivals - queens down, how many are right, how many are not - because
 * seeing where someone has put their queens would hand you the answer. The
 * moment your round ends, the page flips into spectator mode, says so loudly,
 * and the real boards appear.
 *
 * There is no hint, solution, or new-game control anywhere in this tree
 * (requirement 8).
 */
export function RaceView({
  view,
  onSubmit,
  onProgress,
  onSendChat,
  onLeave,
}: {
  view: RoomView;
  onSubmit: (round: number, placements: readonly Placement[]) => void;
  onProgress: (round: number, placements: readonly Placement[]) => void;
  onSendChat: (text: string) => void;
  onLeave: () => void;
}) {
  const state = view.state;
  const phase = state?.phase;
  const self = selfPlayer(view);
  const ownSkin = useGameSkin("queens");
  const [spectating, setSpectating] = useState<PlayerId | null>(null);
  const [autoMark, setAutoMark] = useState(() => localStorage.getItem(AUTO_MARK_KEY) === "true");
  const [celebratedRound, setCelebratedRound] = useState<number | null>(null);
  const submittedRound = useRef<number | null>(null);

  const isRunning = phase?.name === "countdown" || phase?.name === "playing";
  useClockTick(Boolean(isRunning));

  useEffect(() => {
    localStorage.setItem(AUTO_MARK_KEY, String(autoMark));
  }, [autoMark]);

  const round = phase && "round" in phase ? phase.round : 0;
  const board = state?.puzzle?.board ?? null;

  /**
   * Your own board stays on the stage while you are in the round, and for a
   * beat after you solve it so the win animation can play out (the same one the
   * single-player board runs). Only then does the page become a spectator.
   */
  const stillRacing = self?.status === "waiting" || self?.status === "playing";
  const celebrating = self?.status === "finished" && celebratedRound !== round;
  const showOwnBoard = stillRacing || celebrating;
  const watching = !showOwnBoard;
  const locked = isInputLocked(view);

  const watchable = useMemo(() => spectatableIds(view), [view]);

  useEffect(() => {
    if (!watching) {
      return;
    }
    setSpectating((current) =>
      current !== null && watchable.includes(current) ? current : (watchable[0] ?? null),
    );
  }, [watching, watchable]);

  useEffect(() => {
    if (!watching || watchable.length < 2) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
        return;
      }
      event.preventDefault();
      setSpectating((current) =>
        stepSpectatorTarget(watchable, current, event.key === "ArrowRight" ? 1 : -1),
      );
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [watching, watchable]);

  const handlePlacements = useCallback(
    (placements: readonly Placement[], isSolved: boolean) => {
      if (phase?.name !== "playing" || self?.status !== "playing") {
        return;
      }
      onProgress(round, placements);
      if (isSolved && submittedRound.current !== round) {
        submittedRound.current = round;
        onSubmit(round, placements);
      }
    },
    [onProgress, onSubmit, phase?.name, round, self?.status],
  );

  if (!state || !phase) {
    return null;
  }

  const secondsLeft =
    phase.name === "playing" ? secondsUntil(phase.endsAt, view) : state.settings.roundSeconds;
  const countdown = phase.name === "countdown" ? secondsUntil(phase.startsAt, view) : 0;
  const watched = spectating ? state.players.find((player) => player.id === spectating) : null;
  const others = state.players.filter((player) => player.id !== view.selfId);
  const stillIn = state.players.filter((player) => !isEliminated(player)).length;

  return (
    <div className="mp-race" data-mode={watching ? "spectating" : "racing"}>
      <header className="mp-race-head">
        <div className="mp-race-title">
          <h1>Round {round}</h1>
          <span>
            {stillIn} still in · {state.code}
          </span>
        </div>
        <div
          className="mp-clock"
          data-urgent={phase.name === "playing" && secondsLeft <= 15 ? "true" : undefined}
        >
          <Timer size={18} aria-hidden="true" />
          <strong>{formatTime(secondsLeft)}</strong>
        </div>
        <div className="mp-race-actions">
          {showOwnBoard ? (
            <button
              className="secondary-action"
              type="button"
              aria-pressed={autoMark}
              onClick={() => setAutoMark((current) => !current)}
              title="Mark cells your queens already rule out"
            >
              <ShieldX size={18} aria-hidden="true" />
              Auto X
            </button>
          ) : null}
          <button className="secondary-action" type="button" onClick={onLeave}>
            <LogOut size={18} aria-hidden="true" />
            Leave
          </button>
        </div>
      </header>

      {watching ? (
        <p className="mp-spectator-banner" role="status">
          <Eye size={18} aria-hidden="true" />
          <strong>Spectator mode</strong>
          <span>
            {self && isEliminated(self)
              ? "You are out of this game. Watching the rest."
              : "You solved this round. Watching everyone else finish."}
          </span>
        </p>
      ) : null}

      <div className="mp-race-body">
        <section className="mp-stage" aria-label={showOwnBoard ? "Your board" : "Spectating"}>
          {board === null ? (
            <p className="mp-stage-empty" role="status">
              Waiting for the next board...
            </p>
          ) : showOwnBoard ? (
            <RaceBoard
              board={board}
              marker={ownSkin.assets.marker}
              surface={ownSkin.assets.surface}
              locked={locked}
              autoMark={autoMark}
              roundKey={round}
              onPlacementsChange={handlePlacements}
              onCelebrationEnd={() => setCelebratedRound(round)}
              hud={{
                metrics: [
                  { label: "Round", value: String(round) },
                  { label: "Queens", value: `${self?.placed ?? 0}/${state.settings.boardSize}` },
                  { label: "Still in", value: String(stillIn) },
                ],
              }}
            />
          ) : watched ? (
            <SpectatorStage
              watched={watched}
              board={board}
              placements={view.boards[watched.id] ?? []}
              progress={view.progress[watched.id]}
              canStep={watchable.length > 1}
              onStep={(step) =>
                setSpectating((current) => stepSpectatorTarget(watchable, current, step))
              }
            />
          ) : (
            <p className="mp-stage-empty" role="status">
              Nobody left to watch this round.
            </p>
          )}

          {phase.name === "countdown" ? (
            <div className="mp-countdown" role="status" aria-live="assertive">
              <strong>{countdown === 0 ? "Go" : countdown}</strong>
              <span>Board locked until the round starts</span>
            </div>
          ) : null}
        </section>

        <aside className="mp-rail" aria-label="Other players">
          {others.map((player) => (
            <PlayerCard
              key={player.id}
              player={player}
              progress={view.progress[player.id]}
              boardSize={state.settings.boardSize}
              canWatch={watching && watchable.includes(player.id)}
              isWatched={spectating === player.id}
              onWatch={() => setSpectating(player.id)}
            />
          ))}
          {others.length === 0 ? <p className="mp-rail-empty">Nobody else is here.</p> : null}
          <ChatPanel messages={view.chat} selfId={view.selfId} onSend={onSendChat} compact />
        </aside>
      </div>

      {phase.name === "results" ? <ResultsOverlay view={view} /> : null}
      {phase.name === "finished" ? <FinishedOverlay view={view} onLeave={onLeave} /> : null}
    </div>
  );
}

/**
 * One rival in the rail: who they are, what they are using, and how they are
 * doing - as numbers. Never a position.
 */
function PlayerCard({
  player,
  progress,
  boardSize,
  canWatch,
  isWatched,
  onWatch,
}: {
  player: RoomPlayer;
  progress: PlayerProgress | undefined;
  boardSize: number;
  canWatch: boolean;
  isWatched: boolean;
  onWatch: () => void;
}) {
  // Their marker, resolved from their own selections, so the rail is where you
  // see what everyone is playing with (requirement 10).
  const marker = useMemo(() => resolveGameSkin("queens", player.skin).assets.marker, [player.skin]);
  const correct = player.status === "finished" ? boardSize : (progress?.correct ?? player.correct);
  const wrong = progress ? progress.wrong : Math.max(0, player.placed - player.correct);
  const done = player.status === "finished";

  return (
    <article
      className="mp-card"
      data-out={isEliminated(player) ? "true" : undefined}
      data-done={done ? "true" : undefined}
      data-watched={isWatched ? "true" : undefined}
    >
      <header>
        <Avatar
          appearance={{ imageUrl: player.avatarUrl || null, portraitId: player.portraitId }}
          name={player.nickname}
          size="sm"
          decorative
        />
        <span className="mp-card-name">
          {player.nickname} <em>({player.elo})</em>
        </span>
        {player.connected ? null : <WifiOff size={14} aria-hidden="true" className="mp-offline" />}
      </header>

      <div className="mp-card-body">
        <img className="mp-card-marker" src={marker} alt="" aria-hidden="true" />
        <div className="mp-card-counts">
          <strong>
            {correct}
            <span>/{boardSize}</span>
          </strong>
          <em>{wrong > 0 ? `${wrong} misplaced` : "none misplaced"}</em>
        </div>
      </div>

      <div
        className="mp-card-bar"
        role="progressbar"
        aria-valuenow={correct}
        aria-valuemin={0}
        aria-valuemax={boardSize}
        aria-label={`${player.nickname}: ${correct} of ${boardSize} correct`}
      >
        <span style={{ width: `${(correct / Math.max(1, boardSize)) * 100}%` }} />
      </div>

      <footer>
        <span className="mp-card-status">{statusLabel(player)}</span>
        {canWatch ? (
          <button className="mp-card-watch" type="button" aria-pressed={isWatched} onClick={onWatch}>
            <Eye size={13} aria-hidden="true" />
            Watch
          </button>
        ) : null}
      </footer>
    </article>
  );
}

function SpectatorStage({
  watched,
  board,
  placements,
  progress,
  canStep,
  onStep,
}: {
  watched: RoomPlayer;
  board: number[][];
  placements: readonly Placement[];
  progress: PlayerProgress | undefined;
  canStep: boolean;
  onStep: (step: number) => void;
}) {
  return (
    <div className="mp-spectate">
      <div className="mp-spectate-head">
        <button
          className="icon-action"
          type="button"
          onClick={() => onStep(-1)}
          disabled={!canStep}
          aria-label="Watch previous player"
        >
          <ChevronLeft size={20} />
        </button>
        <span>
          <Avatar
            appearance={{ imageUrl: watched.avatarUrl || null, portraitId: watched.portraitId }}
            name={watched.nickname}
            size="sm"
            decorative
          />
          <strong>
            {watched.nickname} <em>({watched.elo})</em>
          </strong>
          <em>
            {statusLabel(watched)}
            {progress ? ` · ${progress.correct} correct` : ""}
          </em>
        </span>
        <button
          className="icon-action"
          type="button"
          onClick={() => onStep(1)}
          disabled={!canStep}
          aria-label="Watch next player"
        >
          <ChevronRight size={20} />
        </button>
      </div>
      <PlayerBoard
        board={board}
        placements={placements}
        skin={watched.skin}
        variant="stage"
        label={`${watched.nickname}'s board`}
      />
      {canStep ? <p className="mp-spectate-hint">Arrow keys switch player.</p> : null}
    </div>
  );
}

function ResultsOverlay({ view }: { view: RoomView }) {
  const state = view.state;
  const elimination = view.lastElimination;
  if (!state) {
    return null;
  }
  const goneOut = (elimination?.playerIds ?? [])
    .map((id) => state.players.find((player) => player.id === id))
    .filter((player): player is RoomPlayer => Boolean(player));
  const names = goneOut.map((player) => player.nickname).join(", ");

  return (
    <div className="mp-overlay" role="status" aria-live="polite">
      <div className="mp-overlay-card">
        <Skull size={30} aria-hidden="true" />
        <h2>{names ? `${names} knocked out` : "Round over"}</h2>
        <p>
          {elimination?.reason === "timeout"
            ? "The clock ran out on them."
            : goneOut.some((player) => !player.connected)
              ? "Left the game or finished last."
              : "Last to finish this round."}
        </p>
        <p className="mp-overlay-note">Next board coming up.</p>
      </div>
    </div>
  );
}

function FinishedOverlay({ view, onLeave }: { view: RoomView; onLeave: () => void }) {
  const state = view.state;
  if (!state || state.phase.name !== "finished") {
    return null;
  }
  const winnerId = state.phase.winner;
  const winnerPlayer = winnerId ? state.players.find((player) => player.id === winnerId) : null;
  const myChange = view.ratings?.find((change) => change.playerId === view.selfId) ?? null;

  return (
    <div className="mp-overlay" role="status" aria-live="assertive">
      <div className="mp-overlay-card mp-overlay-final">
        <Crown size={32} aria-hidden="true" />
        <h2>{winnerPlayer ? `${winnerPlayer.nickname} wins` : "Nobody survived"}</h2>
        {myChange ? (
          <div className="mp-final-elo">
            <span>Your rating</span>
            <EloChangeBadge change={myChange} />
            <span className="mp-final-position">Finished #{myChange.position}</span>
          </div>
        ) : (
          <p className="mp-overlay-note">Working out ratings...</p>
        )}
        <p className="mp-overlay-note">Back to the lobby in a moment - stay for the next game.</p>
        <button className="secondary-action" type="button" onClick={onLeave}>
          <LogOut size={18} aria-hidden="true" />
          Leave lobby
        </button>
      </div>
    </div>
  );
}
