import { useEffect, useMemo, useState } from "react";
import { Loader2, LogIn, Users } from "lucide-react";
import { useAuth } from "@/features/auth/AuthProvider";
import { avatarSource, DEFAULT_APPEARANCE } from "@/features/profile/cosmetics";
import { useSkins } from "@/features/skins/useSkins";
import { LobbyView } from "./LobbyView";
import { ROOM_ERROR_COPY, type RoomErrorCode } from "./protocol";
import { RaceView } from "./RaceView";
import { isHost } from "./roomState";
import { useMultiplayerRoom } from "./useMultiplayerRoom";

const NICKNAME_KEY = "mindlab-guest-nickname";

function storedNickname(): string {
  try {
    return window.localStorage.getItem(NICKNAME_KEY) ?? "";
  } catch {
    return "";
  }
}

function errorCopy(code: string | null): string | null {
  if (!code) {
    return null;
  }
  return ROOM_ERROR_COPY[code as RoomErrorCode] ?? "Something went wrong with that room.";
}

/**
 * The multiplayer route: pick a room, then live in it.
 *
 * Connecting is a deliberate act rather than an effect, because opening a socket
 * with no code *creates* a room - doing that on mount would litter the server
 * with empty rooms every time React re-mounted the tree in development.
 */
export function MultiplayerView({ initialCode }: { initialCode?: string | null }) {
  const { token, user } = useAuth();
  const { selectedSkins } = useSkins();
  const [nickname, setNickname] = useState(() => user?.nickname ?? storedNickname());
  const [code, setCode] = useState(initialCode ?? "");
  // Join leads, because joining is what most people arriving here are trying to
  // do - a code in the URL means someone has already invited them.
  const [tab, setTab] = useState<"join" | "host">("join");

  const identity = useMemo(
    () => ({
      token,
      nickname: (user?.nickname ?? nickname).trim() || "Player",
      skin: selectedSkins.queens,
      avatarUrl: user?.profile_image_url ?? avatarSource(DEFAULT_APPEARANCE),
      portraitId: DEFAULT_APPEARANCE.portraitId,
    }),
    [nickname, selectedSkins.queens, token, user],
  );

  const room = useMultiplayerRoom(identity);
  const { view, status, connect, disconnect } = room;

  useEffect(() => {
    if (!user?.nickname && nickname.trim()) {
      window.localStorage.setItem(NICKNAME_KEY, nickname.trim());
    }
  }, [nickname, user?.nickname]);

  const error = errorCopy(view.error);

  if (status === "open" && view.state) {
    return (
      <main className="mp-shell" aria-label="Multiplayer Queens">
        {view.state.phase.name === "lobby" ? (
          <LobbyView
            state={view.state}
            selfId={view.selfId}
            isHost={isHost(view)}
            error={error}
            chat={view.chat}
            onStart={room.start}
            onUpdateSettings={room.updateSettings}
            onSendChat={room.sendChat}
            onLeave={disconnect}
          />
        ) : (
          <RaceView
            view={view}
            onSubmit={room.submit}
            onProgress={room.reportProgress}
            onSendChat={room.sendChat}
            onLeave={disconnect}
          />
        )}
      </main>
    );
  }

  if (status === "connecting" || status === "reconnecting" || (status === "open" && !view.state)) {
    return (
      <main className="mp-shell mp-shell-centered" aria-label="Multiplayer Queens">
        <p className="mp-connecting" role="status">
          <Loader2 className="spin" size={26} aria-hidden="true" />
          {status === "reconnecting"
            ? `Reconnecting${view.state?.code ? ` to room ${view.state.code}` : ""}…`
            : "Connecting…"}
        </p>
      </main>
    );
  }

  return (
    <main className="mp-shell mp-shell-centered" aria-label="Multiplayer Queens">
      <section className="mp-entry">
        <h1>Multiplayer</h1>

        <div className="mp-tabs" role="tablist" aria-label="Join or host">
          <button
            type="button"
            role="tab"
            id="mp-tab-join"
            aria-selected={tab === "join"}
            aria-controls="mp-panel-join"
            onClick={() => setTab("join")}
          >
            Join
          </button>
          <button
            type="button"
            role="tab"
            id="mp-tab-host"
            aria-selected={tab === "host"}
            aria-controls="mp-panel-host"
            onClick={() => setTab("host")}
          >
            Host
          </button>
        </div>

        {status === "closed" ? (
          <p className="mp-error" role="alert">
            {error ?? "The connection to the room closed."}
          </p>
        ) : error ? (
          <p className="mp-error" role="alert">
            {error}
          </p>
        ) : null}

        {user ? null : (
          <label className="mp-field">
            <span>Your name</span>
            <input
              type="text"
              value={nickname}
              maxLength={24}
              placeholder="Player"
              onChange={(event) => setNickname(event.target.value)}
            />
          </label>
        )}

        {tab === "join" ? (
          <form
            className="mp-entry-panel"
            id="mp-panel-join"
            role="tabpanel"
            aria-labelledby="mp-tab-join"
            onSubmit={(event) => {
              event.preventDefault();
              if (code.trim()) {
                connect(code);
              }
            }}
          >
            <label className="mp-field">
              <span>Game code</span>
              <input
                className="mp-code-input"
                type="text"
                value={code}
                maxLength={6}
                placeholder="ABC123"
                autoComplete="off"
                spellCheck={false}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
              />
            </label>
            <button className="primary-action" type="submit" disabled={!code.trim()}>
              <LogIn size={18} aria-hidden="true" />
              Join game
            </button>
          </form>
        ) : (
          <div
            className="mp-entry-panel"
            id="mp-panel-host"
            role="tabpanel"
            aria-labelledby="mp-tab-host"
          >
            <p className="mp-entry-note">
              You get a code to share. Start whenever you like, full lobby or not.
            </p>
            <button className="primary-action" type="button" onClick={() => connect(null)}>
              <Users size={18} aria-hidden="true" />
              Create game
            </button>
          </div>
        )}

        {user ? null : (
          <p className="mp-entry-note">
            Playing as a guest. Your rating is kept on this device and stays provisional until you
            sign in.
          </p>
        )}
      </section>
    </main>
  );
}
