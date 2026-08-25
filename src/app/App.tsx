import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Gamepad2, Moon, Palette, Settings, Sun, Swords, Trophy, UserRound } from "lucide-react";
import { AccountView } from "@/features/account/AccountView";
import { LeaderboardView } from "@/features/leaderboard/LeaderboardView";
import { PlayerProfileView } from "@/features/profiles/PlayerProfileView";
import { useQueensPatternsSetting } from "@/features/settings/useConfig";
import { useTheme } from "@/features/settings/useTheme";
import { AppearanceView } from "@/features/skins/AppearanceView";
import { paletteToken, resolveGameSkin } from "@/features/skins/skins";
import { useSkins } from "@/features/skins/useSkins";
import { GAME_ICONS } from "@/shared/icons/gameIcons";
import "@/games/lights/styles.css";
import "@/games/mine-islands/styles.css";
import "@/games/mini-chess/styles.css";
import "@/games/queens/styles.css";
import "@/games/tango/styles.css";
import "@/games/tracks/styles.css";
import "@/games/zip/styles.css";
import "@/features/multiplayer/styles.css";
import "@/styles/game-frame.css";
import "@/styles/game-skins.css";
import "@/styles/canvas-board.css";

const APP_NAME = "MindLab";
const APP_FAVICON = "/brand/mindlab-favicon.png";

const QueensGame = lazy(() =>
  import("@/games/queens/QueensGame").then((module) => ({ default: module.QueensGame })),
);
const TangoGame = lazy(() =>
  import("@/games/tango/TangoGame").then((module) => ({ default: module.TangoGame })),
);
const LightsGame = lazy(() =>
  import("@/games/lights/LightsGame").then((module) => ({ default: module.LightsGame })),
);
const TracksGame = lazy(() =>
  import("@/games/tracks/TracksGame").then((module) => ({ default: module.TracksGame })),
);
const ZipGame = lazy(() =>
  import("@/games/zip/ZipGame").then((module) => ({ default: module.ZipGame })),
);
const MineIslandsGame = lazy(() =>
  import("@/games/mine-islands/MineIslandsGame").then((module) => ({
    default: module.MineIslandsGame,
  })),
);
const MiniChessGame = lazy(() =>
  import("@/games/mini-chess/MiniChessGame").then((module) => ({
    default: module.MiniChessGame,
  })),
);
const MultiplayerView = lazy(() =>
  import("@/features/multiplayer/MultiplayerView").then((module) => ({
    default: module.MultiplayerView,
  })),
);

const GAMES = {
  queens: {
    label: "Queens",
    path: "/queens",
    favicon: "/games/queens/favicon.png",
    logo: "/games/queens/logo.png",
    description: "Place one queen per row, column, and region without touching.",
    meta: "4 x 4 to 10 x 10",
    icon: GAME_ICONS.queens,
    component: QueensGame,
  },
  tango: {
    label: "Tango",
    path: "/tango",
    favicon: "/games/tango/favicon.png",
    logo: "/games/tango/logo.png",
    description: "Balance suns and moons while obeying equality clues.",
    meta: "Even boards",
    icon: GAME_ICONS.tango,
    component: TangoGame,
  },
  lights: {
    label: "Lights",
    path: "/lights",
    favicon: "/games/lights/favicon.png",
    logo: "/games/lights/logo.png",
    description: "Flip tiles until every light on the board is glowing.",
    meta: "4 x 4 to 8 x 8",
    icon: GAME_ICONS.lights,
    component: LightsGame,
  },
  tracks: {
    label: "Tracks",
    path: "/tracks",
    favicon: "/games/tracks/favicon.png",
    logo: "/games/tracks/logo.png",
    description: "Rotate pieces into one continuous route between endpoints.",
    meta: "Diagonal tracks",
    icon: GAME_ICONS.tracks,
    component: TracksGame,
  },
  zip: {
    label: "Zip",
    path: "/zip",
    favicon: "/games/zip/favicon.png",
    logo: "/games/zip/logo.png",
    description: "Draw one path through every square in numbered order.",
    meta: "Path puzzle",
    icon: GAME_ICONS.zip,
    component: ZipGame,
  },
  "mine-islands": {
    label: "Mine Islands",
    path: "/mine-islands",
    favicon: "/games/mine-islands/favicon.svg",
    logo: "/games/mine-islands/logo.svg",
    description: "Reveal clear cells and mark hidden hazards using number clues.",
    meta: "6 x 6 to 10 x 10",
    icon: GAME_ICONS["mine-islands"],
    component: MineIslandsGame,
  },
  "mini-chess": {
    label: "MiniChess",
    path: "/mini-chess",
    favicon: "/games/mini-chess/skins/club/bn.svg",
    logo: "/games/mini-chess/skins/club/bn.svg",
    description: "Find a short forced checkmate from a focused position.",
    meta: "5 x 5 or 8 x 8",
    icon: GAME_ICONS["mini-chess"],
    component: MiniChessGame,
  },
} as const;

type GameId = keyof typeof GAMES;
type RouteState =
  | GameId
  | "menu"
  | "config"
  | "appearance"
  | "account"
  | "leaderboard"
  | "player"
  /** The list of multiplayer modes. */
  | "multiplayer"
  /** The elimination race itself. */
  | "knockout";

/**
 * Multiplayer modes. Only knockout is built; the others are listed so the shape
 * of the section is visible rather than implied by a single lonely card.
 */
const MULTIPLAYER_MODES = [
  {
    id: "knockout",
    path: "/multiplayer/knockout",
    label: "Knockout",
    description: "Same board, everyone at once. Slowest solver drops out each round.",
    meta: "2 to 8 players",
    ready: true,
  },
  {
    id: "versus",
    path: "/multiplayer/versus",
    label: "Versus",
    description: "One on one, best of a set number of boards.",
    meta: "Coming soon",
    ready: false,
  },
  {
    id: "custom",
    path: "/multiplayer/custom",
    label: "Custom game",
    description: "Pick the rules: game, board size, round length, elimination style.",
    meta: "Coming soon",
    ready: false,
  },
] as const;

/**
 * Knockout is Queens-only for now, so it borrows the Queens frame: the same
 * palette variables, buttons, and board chrome the single-player route uses.
 * When a second game gets a race mode this becomes a lookup rather than a
 * constant.
 */
const MULTIPLAYER_FRAME_GAME: GameId = "queens";

function pathFromLocation(): string {
  const hashPath = window.location.hash.replace(/^#/, "").replace(/^\/+/, "");
  return hashPath || window.location.pathname.replace(/^\/+/, "");
}

function playerIdFromLocation(): number | null {
  const [firstSegment, idSegment] = pathFromLocation().split("?")[0].split("/");
  if (firstSegment.toLowerCase() !== "players") {
    return null;
  }
  const playerId = Number(idSegment);
  return Number.isSafeInteger(playerId) && playerId > 0 ? playerId : null;
}

/**
 * `#/multiplayer/knockout/ABC123` prefills the join field, so a room code is
 * shareable as a link.
 */
function roomCodeFromLocation(): string | null {
  const [first, second, third] = pathFromLocation().split("?")[0].split("/");
  if (first.toLowerCase() !== "multiplayer" || second?.toLowerCase() !== "knockout" || !third) {
    return null;
  }
  return third.toUpperCase();
}

function routeFromLocation(): RouteState {
  const path = pathFromLocation();
  const [firstSegment, secondSegment] = path.split("?")[0].toLowerCase().split("/");
  if (firstSegment === "multiplayer") {
    return secondSegment === "knockout" ? "knockout" : "multiplayer";
  }
  if (firstSegment === "config") {
    return "config";
  }
  if (firstSegment === "appearance") {
    return "appearance";
  }
  if (firstSegment === "account") {
    return "account";
  }
  if (firstSegment === "leaderboard") {
    return "leaderboard";
  }
  if (firstSegment === "players" && playerIdFromLocation() !== null) {
    return "player";
  }
  return firstSegment in GAMES ? (firstSegment as GameId) : "menu";
}

function setFavicon(href: string): void {
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.href = href;
}

export default function App() {
  const [route, setRoute] = useState<RouteState>(() => routeFromLocation());
  const [playerId, setPlayerId] = useState<number | null>(() => playerIdFromLocation());
  const [roomCode, setRoomCode] = useState<string | null>(() => roomCodeFromLocation());
  const { theme, toggleTheme } = useTheme();
  const { selectedSkins } = useSkins();
  const activeGame = route in GAMES ? (route as GameId) : null;
  const game = activeGame ? GAMES[activeGame] : null;
  const GameComponent = game?.component;
  /** The game whose chrome the page wears, which multiplayer borrows. */
  const framedGame = activeGame ?? (route === "knockout" ? MULTIPLAYER_FRAME_GAME : null);
  const activeSkin = useMemo(
    () => (framedGame ? resolveGameSkin(framedGame, selectedSkins[framedGame]) : null),
    [framedGame, selectedSkins],
  );
  const navItems = useMemo(() => Object.entries(GAMES) as Array<[GameId, (typeof GAMES)[GameId]]>, []);

  useEffect(() => {
    const updateRoute = () => {
      setRoute(routeFromLocation());
      setPlayerId(playerIdFromLocation());
      setRoomCode(roomCodeFromLocation());
    };
    window.addEventListener("hashchange", updateRoute);
    window.addEventListener("popstate", updateRoute);
    return () => {
      window.removeEventListener("hashchange", updateRoute);
      window.removeEventListener("popstate", updateRoute);
    };
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [playerId, route]);

  useEffect(() => {
    const routeTitles: Partial<Record<RouteState, string>> = {
      config: "Config",
      appearance: "Appearance",
      account: "Account",
      leaderboard: "Leaderboard",
      player: "Player Profile",
      multiplayer: "Multiplayer",
      knockout: "Knockout",
    };
    const label = game?.label ?? routeTitles[route];
    document.title = label ? `${label} | ${APP_NAME}` : APP_NAME;
    setFavicon(game?.favicon ?? (route === "knockout" ? GAMES.queens.favicon : APP_FAVICON));
  }, [game, route]);

  return (
    <div
      className={`suite-shell ${framedGame ? `game-${framedGame}` : route === "config" ||
            route === "appearance" ||
            route === "account" ||
            route === "leaderboard" ||
            route === "player" ? "game-config" : "game-menu"}`}
      data-game={framedGame ?? undefined}
      data-palette={
        framedGame && activeSkin ? paletteToken(framedGame, activeSkin.palette.id) : undefined
      }
      data-tint={
        framedGame && activeSkin?.tint ? paletteToken(framedGame, activeSkin.tint.id) : undefined
      }
      data-pixelated={activeSkin?.pixelated ? "true" : undefined}
    >
      <nav className="suite-nav" aria-label="Game navigation">
        <a className="suite-brand" href="#/" aria-label={`${APP_NAME} menu`}>
          <img className="suite-brand-mark" src="/brand/mindlab-logo-192.png" alt="" />
          <span>{APP_NAME}</span>
        </a>
        <div className="suite-tabs">
          <a
            className={`suite-tab ${activeGame || route === "menu" ? "is-active" : ""}`}
            href="#/"
            aria-current={activeGame || route === "menu" ? "page" : undefined}
          >
            <Gamepad2 aria-hidden="true" size={17} />
            <span>Single player</span>
          </a>
          <a
            className={`suite-tab ${route === "multiplayer" || route === "knockout" ? "is-active" : ""}`}
            href="#/multiplayer"
            aria-current={route === "multiplayer" || route === "knockout" ? "page" : undefined}
          >
            <Swords aria-hidden="true" size={17} />
            <span>Multiplayer</span>
          </a>
        </div>
        <a
          className={`suite-config-button suite-leaderboard-button ${route === "leaderboard" ? "is-active" : ""}`}
          href="#/leaderboard"
          aria-label="Open leaderboard"
          aria-current={route === "leaderboard" ? "page" : undefined}
          title="Leaderboard"
        >
          <Trophy aria-hidden="true" size={18} />
        </a>
        <a
          className={`suite-config-button suite-account-button ${route === "account" ? "is-active" : ""}`}
          href="#/account"
          aria-label="Open account"
          aria-current={route === "account" ? "page" : undefined}
          title="Account"
        >
          <UserRound aria-hidden="true" size={18} />
        </a>
        <a
          className={`suite-config-button suite-appearance-button ${route === "appearance" ? "is-active" : ""}`}
          href="#/appearance"
          aria-label="Open appearance"
          aria-current={route === "appearance" ? "page" : undefined}
          title="Appearance"
        >
          <Palette aria-hidden="true" size={18} />
        </a>
        <a
          className={`suite-config-button suite-settings-button ${route === "config" ? "is-active" : ""}`}
          href="#/config"
          aria-label="Open config"
          aria-current={route === "config" ? "page" : undefined}
          title="Config"
        >
          <Settings aria-hidden="true" size={18} />
        </a>
        <button
          className="suite-theme-button"
          type="button"
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
          aria-pressed={theme === "dark"}
          onClick={toggleTheme}
          title={theme === "dark" ? "Light theme" : "Dark theme"}
        >
          {theme === "dark" ? <Sun aria-hidden="true" size={18} /> : <Moon aria-hidden="true" size={18} />}
        </button>
      </nav>
      {GameComponent ? (
        <Suspense
          fallback={(
            <main className="game-route-loading" role="status">
              <span className="sr-only">Loading {game.label}</span>
            </main>
          )}
        >
          <GameComponent />
        </Suspense>
      ) : route === "config" ? (
        <ConfigView />
      ) : route === "appearance" ? (
        <AppearanceView />
      ) : route === "account" ? (
        <AccountView />
      ) : route === "leaderboard" ? (
        <LeaderboardView />
      ) : route === "player" && playerId !== null ? (
        <PlayerProfileView playerId={playerId} />
      ) : route === "multiplayer" ? (
        <MultiplayerModes />
      ) : route === "knockout" ? (
        <Suspense
          fallback={(
            <main className="game-route-loading" role="status">
              <span className="sr-only">Loading multiplayer</span>
            </main>
          )}
        >
          <MultiplayerView initialCode={roomCode} />
        </Suspense>
      ) : (
        <MainMenu navItems={navItems} />
      )}
    </div>
  );
}

function ConfigView() {
  const [showQueensPatterns, setShowQueensPatterns] = useQueensPatternsSetting();

  return (
    <main className="config-shell" aria-labelledby="config-title">
      <section className="config-heading">
        <h1 id="config-title">Config</h1>
        <p>Shared preferences for MindLab.</p>
      </section>

      <section className="config-panel" aria-labelledby="accessibility-title">
        <div className="config-section-title">
          <Settings aria-hidden="true" size={21} />
          <h2 id="accessibility-title">Accessibility</h2>
        </div>

        <label className="config-row">
          <span className="config-row-icon" aria-hidden="true">
            <Palette size={20} />
          </span>
          <span className="config-row-copy">
            <strong>Colorblind region patterns</strong>
            <span>Show subtle patterns on Queens regions.</span>
          </span>
          <span className="config-switch">
            <input
              type="checkbox"
              checked={showQueensPatterns}
              onChange={(event) => setShowQueensPatterns(event.target.checked)}
            />
            <span aria-hidden="true" />
          </span>
        </label>
      </section>
    </main>
  );
}

/**
 * The multiplayer section. It lists modes rather than games, because which game
 * a race is played with is a room setting, not a menu choice.
 */
function MultiplayerModes() {
  return (
    <main className="menu-shell" aria-labelledby="modes-title">
      <section className="menu-heading">
        <h1 id="modes-title">Multiplayer</h1>
        <p>Play against other people in real time.</p>
      </section>

      <section className="game-picker" aria-label="Multiplayer modes">
        {MULTIPLAYER_MODES.map((mode) =>
          mode.ready ? (
            <a className="game-card game-card-queens" href={`#${mode.path}`} key={mode.id}>
              <span className="game-card-logo" aria-hidden="true">
                <img src={GAMES.queens.logo} alt="" />
              </span>
              <span className="game-card-copy">
                <span className="game-card-title">
                  <Swords aria-hidden="true" size={19} />
                  {mode.label}
                </span>
                <span className="game-card-description">{mode.description}</span>
                <span className="game-card-meta">{mode.meta}</span>
              </span>
            </a>
          ) : (
            <span className="game-card is-disabled" key={mode.id} aria-disabled="true">
              <span className="game-card-logo" aria-hidden="true">
                <Swords size={26} />
              </span>
              <span className="game-card-copy">
                <span className="game-card-title">{mode.label}</span>
                <span className="game-card-description">{mode.description}</span>
                <span className="game-card-meta">{mode.meta}</span>
              </span>
            </span>
          ),
        )}
      </section>
    </main>
  );
}

function MainMenu({
  navItems,
}: {
  navItems: Array<[GameId, (typeof GAMES)[GameId]]>;
}) {
  return (
    <main className="menu-shell" aria-labelledby="menu-title">
      <section className="menu-heading">
        <h1 id="menu-title">Single player</h1>
        <p>Choose a game and jump straight into a fresh puzzle.</p>
      </section>

      <section className="game-picker" aria-label="Available games">
        {navItems.map(([id, item]) => {
          const Icon = item.icon;
          return (
            <a className={`game-card game-card-${id}`} href={`#${item.path}`} key={id}>
              <span className="game-card-logo" aria-hidden="true">
                <img src={item.logo} alt="" />
              </span>
              <span className="game-card-copy">
                <span className="game-card-title">
                  <Icon aria-hidden="true" size={19} />
                  {item.label}
                </span>
                <span className="game-card-description">{item.description}</span>
                <span className="game-card-meta">{item.meta}</span>
              </span>
            </a>
          );
        })}
      </section>
    </main>
  );
}
