import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { apiPath } from "@/shared/api";
import { takePuzzleHandle } from "@/shared/puzzleHandles";

const TOKEN_KEY = "mindlab-auth-token";

/**
 * Where a finished game is handed to the signed-in session.
 *
 * This used to be a `window` CustomEvent, which meant anything running on the
 * page could dispatch a fully formed result. A module-local reference keeps the
 * hand-off inside the app.
 */
let activeResultSink: ((result: GameResult) => void) | null = null;

export type ProfileGender = "woman" | "man" | "non_binary" | "other";

export type ProfileLinks = {
  website: string | null;
  linkedin: string | null;
  github: string | null;
  instagram: string | null;
  x: string | null;
};

export type UserProfile = {
  id: number;
  email: string;
  nickname: string;
  profile_image_url: string | null;
  nationality: string | null;
  location: string | null;
  gender: ProfileGender | null;
  bio: string | null;
  social_links: ProfileLinks;
  created_at: number;
};

export type PlayerGameSummary = {
  game: string;
  games_played: number;
  wins: number;
  win_rate: number;
  average_time_seconds: number | null;
};

/**
 * A ranked rating, one per multiplayer mode. `provisional` means fewer than ten
 * rated games: the rating still moves fast and is kept off public leaderboards.
 * See `docs/multiplayer.md`.
 */
export type PlayerEloSummary = {
  mode: string;
  rating: number;
  games_played: number;
  provisional: boolean;
};

export type PlayerProfile = Omit<UserProfile, "email"> & {
  stats: PlayerGameSummary[];
  elo: PlayerEloSummary[];
};

export type ProfileUpdateInput = {
  nickname?: string;
  profile_image_url?: string | null;
  nationality?: string | null;
  location?: string | null;
  gender?: ProfileGender | null;
  bio?: string | null;
  social_links?: Partial<ProfileLinks>;
};

export type AuthResponse = {
  token: string;
  user: UserProfile;
};

export type GameStat = {
  game: string;
  difficulty: string;
  games_played: number;
  wins: number;
  win_rate: number;
  best_time_seconds: number | null;
};

export type LeaderboardRow = GameStat & {
  user: {
    id: number;
    nickname: string;
    profile_image_url: string | null;
  };
};

export type LeaderboardSort = "played" | "wins" | "best_time";
export type LeaderboardDirection = "asc" | "desc";

export type RankedLeaderboardRow = LeaderboardRow & {
  rank: number;
};

export type LeaderboardPage = {
  rows: RankedLeaderboardRow[];
  total: number;
  total_players: number;
  page: number;
  page_size: number;
  total_pages: number;
};

export type GameResult = {
  result_id: string;
  /** Signed proof that this puzzle came from the API. Required by the backend. */
  puzzle_handle: string;
  game: string;
  difficulty: string;
  time_seconds?: number;
  /**
   * The finished board, in whatever shape this game uses. The server checks it
   * against the puzzle it generated and decides whether it was solved, so there
   * is no `won` field to send - and no `assisted` field either, because the
   * server already knows whether the answer was revealed.
   *
   * Left out for an abandoned game, which is how a loss is reported now.
   */
  submission?: unknown;
};

export type OAuthProvider = {
  id: "google" | "facebook";
  label: string;
  enabled: boolean;
};

/**
 * Rendered before `/auth/providers` answers, and kept as the fallback if that
 * request fails. The account screen shows these disabled rather than hiding
 * social sign-in entirely, so the option is visible while credentials are
 * still being set up. The server remains the source of truth for `enabled`.
 */
const KNOWN_PROVIDERS: OAuthProvider[] = [
  { id: "google", label: "Google", enabled: false },
  { id: "facebook", label: "Facebook", enabled: false },
];

type AuthContextValue = {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  authError: string | null;
  socialProviders: OAuthProvider[];
  register: (input: { email: string; password: string; nickname: string }) => Promise<void>;
  login: (input: { email: string; password: string }) => Promise<void>;
  startSocialLogin: (provider: OAuthProvider["id"]) => void;
  logout: () => void;
  exportAccount: () => Promise<unknown>;
  deleteAccount: () => Promise<void>;
  updateProfile: (input: ProfileUpdateInput) => Promise<void>;
  loadPlayerProfile: (userId: number) => Promise<PlayerProfile>;
  loadStats: () => Promise<GameStat[]>;
  loadLeaderboard: (input: {
    game: string;
    difficulty: string;
    sortBy: LeaderboardSort;
    direction: LeaderboardDirection;
    page: number;
    pageSize: number;
    search?: string;
  }) => Promise<LeaderboardPage>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function requestJson<T>(path: string, options: RequestInit = {}, token?: string | null): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(apiPath(path), { ...options, headers });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      typeof payload?.detail === "string" ? payload.detail : `Request failed (${response.status}).`;
    throw new ApiError(message, response.status);
  }
  return payload as T;
}

function storeSession(session: AuthResponse): void {
  window.localStorage.setItem(TOKEN_KEY, session.token);
}

function consumeOAuthRedirect(): { token: string | null; error: string | null } {
  const storedToken = window.localStorage.getItem(TOKEN_KEY);
  const queryIndex = window.location.hash.indexOf("?");
  if (queryIndex < 0) {
    return { token: storedToken, error: null };
  }

  const routeHash = window.location.hash.slice(0, queryIndex);
  const parameters = new URLSearchParams(window.location.hash.slice(queryIndex + 1));
  const oauthToken = parameters.get("auth_token");
  const oauthError = parameters.get("auth_error");
  if (!oauthToken && !oauthError) {
    return { token: storedToken, error: null };
  }

  if (oauthToken) {
    window.localStorage.setItem(TOKEN_KEY, oauthToken);
  }
  window.history.replaceState(
    window.history.state,
    "",
    `${window.location.pathname}${window.location.search}${routeHash}`,
  );
  return {
    token: oauthToken ?? storedToken,
    error: oauthError,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [initialSession] = useState(consumeOAuthRedirect);
  const [token, setToken] = useState<string | null>(initialSession.token);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(token));
  const [sessionRetry, setSessionRetry] = useState(0);
  const [authError, setAuthError] = useState<string | null>(initialSession.error);
  const [socialProviders, setSocialProviders] = useState<OAuthProvider[]>(KNOWN_PROVIDERS);

  useEffect(() => {
    const retrySession = () => setSessionRetry((current) => current + 1);
    window.addEventListener("mindlab:api-online", retrySession);
    return () => window.removeEventListener("mindlab:api-online", retrySession);
  }, []);

  useEffect(() => {
    requestJson<OAuthProvider[]>("/auth/providers")
      .then((providers) => setSocialProviders(providers.length > 0 ? providers : KNOWN_PROVIDERS))
      .catch(() => setSocialProviders(KNOWN_PROVIDERS));
  }, []);

  useEffect(() => {
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    requestJson<UserProfile>("/me", { method: "GET" }, token)
      .then((profile) => {
        if (!cancelled) {
          setUser(profile);
          setAuthError(null);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setUser(null);
          if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
            window.localStorage.removeItem(TOKEN_KEY);
            setToken(null);
          }
          setAuthError(error instanceof Error ? error.message : "Could not restore session.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [sessionRetry, token]);

  const applySession = useCallback((session: AuthResponse) => {
    storeSession(session);
    setToken(session.token);
    setUser(session.user);
    setAuthError(null);
  }, []);

  const register = useCallback(
    async (input: { email: string; password: string; nickname: string }) => {
      const session = await requestJson<AuthResponse>("/auth/register", {
        method: "POST",
        body: JSON.stringify(input),
      });
      applySession(session);
    },
    [applySession],
  );

  const login = useCallback(
    async (input: { email: string; password: string }) => {
      const session = await requestJson<AuthResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify(input),
      });
      applySession(session);
    },
    [applySession],
  );

  const logout = useCallback(() => {
    window.localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    setAuthError(null);
  }, []);

  const exportAccount = useCallback(
    () => requestJson<unknown>("/me/export", { method: "GET" }, token),
    [token],
  );

  const deleteAccount = useCallback(async () => {
    await requestJson<null>("/me", { method: "DELETE" }, token);
    logout();
  }, [logout, token]);

  const startSocialLogin = useCallback(
    (provider: OAuthProvider["id"]) => {
      const available = socialProviders.some((entry) => entry.id === provider && entry.enabled);
      if (!available) {
        setAuthError(`${provider === "google" ? "Google" : "Facebook"} sign-in is not configured.`);
        return;
      }
      const returnTo = encodeURIComponent(window.location.origin);
      window.location.assign(apiPath(`/auth/oauth/${provider}/start?return_to=${returnTo}`));
    },
    [socialProviders],
  );

  const updateProfile = useCallback(
    async (input: ProfileUpdateInput) => {
      const nextUser = await requestJson<UserProfile>(
        "/me",
        {
          method: "PATCH",
          body: JSON.stringify(input),
        },
        token,
      );
      setUser(nextUser);
    },
    [token],
  );

  const loadPlayerProfile = useCallback(
    (userId: number) => requestJson<PlayerProfile>(`/players/${userId}`, { method: "GET" }),
    [],
  );

  const loadStats = useCallback(() => requestJson<GameStat[]>("/stats/me", { method: "GET" }, token), [token]);

  const loadLeaderboard = useCallback(
    (input: {
      game: string;
      difficulty: string;
      sortBy: LeaderboardSort;
      direction: LeaderboardDirection;
      page: number;
      pageSize: number;
      search?: string;
    }) => {
      const params = new URLSearchParams({
        game: input.game,
        difficulty: input.difficulty,
        sort_by: input.sortBy,
        direction: input.direction,
        page: String(input.page),
        page_size: String(input.pageSize),
      });
      if (input.search) {
        params.set("search", input.search);
      }
      return requestJson<LeaderboardPage>(`/leaderboard/page?${params}`, { method: "GET" });
    },
    [],
  );

  useEffect(() => {
    if (!token || !user) {
      return;
    }

    const handleResult = (result: GameResult) => {
      if (!result?.game || !result.difficulty) {
        return;
      }
      void requestJson<GameStat>(
        "/stats/results",
        {
          method: "POST",
          body: JSON.stringify(result),
        },
        token,
      ).catch(() => {
        // Stats are a nice-to-have path; never interrupt gameplay because sync failed.
      });
    };

    activeResultSink = handleResult;
    return () => {
      if (activeResultSink === handleResult) {
        activeResultSink = null;
      }
    };
  }, [token, user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isLoading,
      authError,
      socialProviders,
      register,
      login,
      startSocialLogin,
      logout,
      exportAccount,
      deleteAccount,
      updateProfile,
      loadPlayerProfile,
      loadStats,
      loadLeaderboard,
    }),
    [
      authError,
      deleteAccount,
      exportAccount,
      isLoading,
      loadLeaderboard,
      loadPlayerProfile,
      loadStats,
      login,
      logout,
      register,
      socialProviders,
      startSocialLogin,
      token,
      updateProfile,
      user,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return value;
}

// eslint-disable-next-line react-refresh/only-export-components
export function reportGameResult(result: Omit<GameResult, "result_id" | "puzzle_handle">): void {
  // The handle was stored when this board was generated. Without it the backend
  // has no way to tell a real solve from a fabricated one, so drop the report
  // rather than send something that will be rejected.
  const puzzleHandle = takePuzzleHandle(result.game, result.difficulty);
  if (!puzzleHandle || !activeResultSink) {
    return;
  }

  const resultId =
    typeof window.crypto?.randomUUID === "function"
      ? window.crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  activeResultSink({ ...result, result_id: resultId, puzzle_handle: puzzleHandle });
}

// eslint-disable-next-line react-refresh/only-export-components
export function useGameResultReporter({
  runKey,
  completed,
  game,
  difficulty,
  time_seconds,
  submission,
}: {
  runKey: object | null;
  completed: boolean;
} & Omit<GameResult, "result_id" | "puzzle_handle">): void {
  const reportedRunRef = useRef<object | null>(null);

  // The submission is read through a ref so that a board changing shape between
  // renders cannot re-fire the report, while the value sent is still whatever
  // was on screen at the moment the puzzle was finished.
  const submissionRef = useRef(submission);
  submissionRef.current = submission;

  useEffect(() => {
    if (!runKey || !completed || reportedRunRef.current === runKey) {
      return;
    }
    reportedRunRef.current = runKey;
    reportGameResult({
      game,
      difficulty,
      time_seconds,
      submission: submissionRef.current,
    });
  }, [completed, difficulty, game, runKey, time_seconds]);
}
