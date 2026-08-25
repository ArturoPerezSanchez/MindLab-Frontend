import { useState } from "react";
import { Check, Copy, Crown, LogOut, Play, Users, WifiOff } from "lucide-react";
import { Avatar } from "@/features/profile/Avatar";
import { Flag } from "@/features/profile/Flag";
import { ChatPanel } from "./ChatPanel";
import {
  MAX_BOARD_SIZE,
  MAX_ROUND_SECONDS,
  MIN_BOARD_SIZE,
  MIN_PLAYERS_TO_START,
  MIN_ROUND_SECONDS,
  type ChatMessage,
  type EditableSettings,
  type RoomState,
} from "./protocol";

/**
 * The games a race can be played with. Only Queens exists today; the rest are
 * listed as disabled so the shape of where this is going is visible in the
 * product rather than only in a backlog. "Mixed" is the Mario Kart idea: each
 * round picks a game, later from the players' own shortlists.
 */
const GAME_CHOICES: ReadonlyArray<{ id: string; label: string; ready: boolean }> = [
  { id: "queens", label: "Queens", ready: true },
  { id: "tango", label: "Tango", ready: false },
  { id: "zip", label: "Zip", ready: false },
  { id: "lights", label: "Lights", ready: false },
  { id: "tracks", label: "Tracks", ready: false },
  { id: "mine-islands", label: "Mine Islands", ready: false },
  { id: "mini-chess", label: "MiniChess", ready: false },
  { id: "mixed", label: "Mixed - a different game each round", ready: false },
];

const BOARD_SIZES = Array.from(
  { length: MAX_BOARD_SIZE - MIN_BOARD_SIZE + 1 },
  (_, index) => MIN_BOARD_SIZE + index,
);
const ROUND_LENGTHS = [60, 90, 120, 180, 240, 300, 420, 600].filter(
  (seconds) => seconds >= MIN_ROUND_SECONDS && seconds <= MAX_ROUND_SECONDS,
);

function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      className="mp-code"
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(code).then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1600);
        });
      }}
      aria-label={`Copy game code ${code.split("").join(" ")}`}
    >
      <span className="mp-code-value">{code}</span>
      {copied ? <Check size={17} aria-hidden="true" /> : <Copy size={17} aria-hidden="true" />}
    </button>
  );
}

/**
 * The waiting room: a code to share, who is in, and the settings the host can
 * change before anyone plays (requirement 11).
 *
 * Settings are host-only *and* server-enforced - the inputs below are disabled
 * for everyone else, but `handle_update_settings` also drops the message, so
 * the disabled attribute is a courtesy rather than the control.
 */
export function LobbyView({
  state,
  selfId,
  isHost,
  error,
  chat,
  onStart,
  onUpdateSettings,
  onSendChat,
  onLeave,
}: {
  state: RoomState;
  selfId: string | null;
  isHost: boolean;
  error: string | null;
  chat: readonly ChatMessage[];
  onStart: () => void;
  onUpdateSettings: (settings: Partial<EditableSettings>) => void;
  onSendChat: (text: string) => void;
  onLeave: () => void;
}) {
  const connected = state.players.filter((player) => player.connected);
  const canStart = connected.length >= MIN_PLAYERS_TO_START;

  return (
    <div className="mp-lobby">
      <header className="mp-lobby-head">
        <div>
          <h1>Queens race</h1>
          <p>
            Share this code. Last to finish each round is knocked out until one player is left.
          </p>
        </div>
        <CopyCode code={state.code} />
      </header>

      {error ? (
        <p className="mp-error" role="alert">
          {error}
        </p>
      ) : null}

      <section className="mp-roster" aria-labelledby="mp-roster-title">
        <h2 id="mp-roster-title">
          <Users size={18} aria-hidden="true" />
          Players {state.players.length}/{state.settings.maxPlayers}
        </h2>
        <ul>
          {state.players.map((player) => (
            <li key={player.id} data-self={player.id === selfId ? "true" : undefined}>
              <Avatar
                appearance={{ imageUrl: player.avatarUrl || null, portraitId: player.portraitId }}
                name={player.nickname}
                size="md"
                decorative
              />
              <span className="mp-roster-name">
                <strong>
                  {player.nickname}
                  {player.id === selfId ? <span className="mp-you">you</span> : null}
                </strong>
                <span className="mp-roster-meta">
                  {player.nationality ? <Flag code={player.nationality} size={16} /> : null}
                  {player.elo} ELO
                  {player.isGuest ? <span className="mp-guest">guest</span> : null}
                </span>
              </span>
              {state.hostId === player.id ? (
                <span className="mp-host-badge" title="Host">
                  <Crown size={16} aria-hidden="true" />
                  <span className="sr-only">Host</span>
                </span>
              ) : null}
              {player.connected ? null : (
                <span className="mp-offline" title="Disconnected">
                  <WifiOff size={16} aria-hidden="true" />
                  <span className="sr-only">Disconnected</span>
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="mp-settings" aria-labelledby="mp-settings-title">
        <h2 id="mp-settings-title">Settings</h2>
        <label>
          <span>Game</span>
          <select
            value={state.settings.gameId}
            disabled={!isHost}
            onChange={(event) => onUpdateSettings({ gameId: event.target.value as "queens" })}
          >
            {GAME_CHOICES.map((choice) => (
              <option key={choice.id} value={choice.id} disabled={!choice.ready}>
                {choice.label}
                {choice.ready ? "" : " (soon)"}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Board</span>
          <select
            value={state.settings.boardSize}
            disabled={!isHost}
            onChange={(event) => onUpdateSettings({ boardSize: Number(event.target.value) })}
          >
            {BOARD_SIZES.map((size) => (
              <option key={size} value={size}>
                {size} x {size}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Round time</span>
          <select
            value={state.settings.roundSeconds}
            disabled={!isHost}
            onChange={(event) => onUpdateSettings({ roundSeconds: Number(event.target.value) })}
          >
            {ROUND_LENGTHS.map((seconds) => (
              <option key={seconds} value={seconds}>
                {seconds < 60 ? `${seconds}s` : `${Math.round(seconds / 60)} min`}
              </option>
            ))}
          </select>
        </label>
        {isHost ? null : <p className="mp-settings-note">Only the host can change these.</p>}
      </section>

      <ChatPanel messages={chat} selfId={selfId} onSend={onSendChat} />

      <footer className="mp-lobby-actions">
        <button className="secondary-action" type="button" onClick={onLeave}>
          <LogOut size={18} aria-hidden="true" />
          Leave
        </button>
        {isHost ? (
          <button className="primary-action" type="button" onClick={onStart} disabled={!canStart}>
            <Play size={18} aria-hidden="true" />
            {canStart ? "Start game" : `Waiting for ${MIN_PLAYERS_TO_START - connected.length} more`}
          </button>
        ) : (
          <p className="mp-waiting" role="status">
            Waiting for the host to start.
          </p>
        )}
      </footer>
    </div>
  );
}
