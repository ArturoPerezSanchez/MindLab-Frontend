import { useEffect, useState } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import type { EloChange } from "./protocol";

const DURATION_MS = 1100;

function prefersReducedMotion(): boolean {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

/** Ease-out, so the number decelerates into its final value rather than stopping dead. */
function easeOut(progress: number): number {
  return 1 - (1 - progress) ** 3;
}

/**
 * The rating counting up or down to its new value (requirement 14).
 *
 * The numbers are the server's - `before` and `after` both arrive in the
 * `ratings` message. This only animates between them; it never computes a
 * rating, which is why the client's copy of the Elo formula in `elo.ts` is not
 * called here.
 */
export function EloChangeBadge({ change }: { change: EloChange }) {
  const [displayed, setDisplayed] = useState(change.before);
  const delta = change.after - change.before;

  useEffect(() => {
    if (prefersReducedMotion() || delta === 0) {
      setDisplayed(change.after);
      return;
    }

    let frame = 0;
    const startedAt = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / DURATION_MS);
      setDisplayed(Math.round(change.before + delta * easeOut(progress)));
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [change.after, change.before, delta]);

  return (
    <span className="mp-elo-badge" data-direction={delta >= 0 ? "up" : "down"}>
      <strong>{displayed}</strong>
      <span className="mp-elo-delta">
        {delta >= 0 ? <TrendingUp size={14} aria-hidden="true" /> : <TrendingDown size={14} aria-hidden="true" />}
        {delta >= 0 ? `+${delta}` : delta}
      </span>
      <span className="sr-only">
        Rating {delta >= 0 ? "gained" : "lost"} {Math.abs(delta)}, now {change.after}.
      </span>
    </span>
  );
}
