const GUEST_KEY = "mindlab-guest-id";

/**
 * A stable per-browser id for players without an account.
 *
 * It is what lets a guest keep a rating across games (requirement 14) and what
 * lets a refresh re-attach to the player already in the room rather than
 * arriving as a stranger. It is deliberately weak: clearing storage discards it,
 * which is exactly why guest ratings are marked provisional and stay off public
 * leaderboards. See `docs/multiplayer.md`.
 */
export function guestId(): string {
  try {
    const stored = window.localStorage.getItem(GUEST_KEY);
    if (stored) {
      return stored;
    }
    const created =
      typeof window.crypto?.randomUUID === "function"
        ? window.crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(GUEST_KEY, created);
    return created;
  } catch {
    // Private browsing with storage disabled: the player still gets a room, they
    // just arrive as a new guest each time.
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  }
}
