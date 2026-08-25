/**
 * Rating for a free-for-all elimination game.
 *
 * Standard Elo is defined for two players. The usual generalisation, and the one
 * used here, treats an N-player result as every pairing played at once: each
 * player is scored against every other, and their rating moves by the average of
 * those pairwise results. That keeps the familiar properties — beating a
 * stronger field gains more, and the table stays roughly zero-sum — without
 * inventing a bespoke formula.
 */

export const DEFAULT_ELO = 1000;
/** Provisional players move faster until the rating settles. */
const K_PROVISIONAL = 40;
const K_ESTABLISHED = 24;
const PROVISIONAL_GAMES = 10;

export type RatedPlayer = {
  id: string;
  elo: number;
  /** Games already rated, used only to pick the K factor. */
  gamesPlayed: number;
  /** 1 is the winner; players eliminated in the same round share a position. */
  position: number;
};

export type RatingResult = {
  id: string;
  before: number;
  after: number;
  delta: number;
  position: number;
};

function expectedScore(rating: number, opponent: number): number {
  return 1 / (1 + 10 ** ((opponent - rating) / 400));
}

function kFactor(gamesPlayed: number): number {
  return gamesPlayed < PROVISIONAL_GAMES ? K_PROVISIONAL : K_ESTABLISHED;
}

/**
 * Ratings after one finished game. A single player, or an empty table, is a
 * no-op rather than an error: lobbies can legitimately end up that way when
 * people disconnect.
 */
export function applyGameRatings(players: readonly RatedPlayer[]): RatingResult[] {
  if (players.length < 2) {
    return players.map((player) => ({
      id: player.id,
      before: player.elo,
      after: player.elo,
      delta: 0,
      position: player.position,
    }));
  }

  const opponents = players.length - 1;

  return players.map((player) => {
    let expected = 0;
    let actual = 0;

    for (const other of players) {
      if (other.id === player.id) {
        continue;
      }
      expected += expectedScore(player.elo, other.elo);
      // A shared position is a draw against that opponent.
      if (player.position < other.position) {
        actual += 1;
      } else if (player.position === other.position) {
        actual += 0.5;
      }
    }

    const delta = Math.round(
      (kFactor(player.gamesPlayed) * (actual - expected)) / opponents,
    );

    return {
      id: player.id,
      before: player.elo,
      after: Math.max(100, player.elo + delta),
      delta,
      position: player.position,
    };
  });
}

/**
 * Final standings from elimination order. The survivor is first; players knocked
 * out later place higher, and players eliminated in the same round tie, which is
 * what a shared timeout should mean.
 */
export function standingsFromElimination(
  eliminationRounds: ReadonlyMap<string, number>,
  winnerId: string | null,
): Map<string, number> {
  const ordered = [...eliminationRounds.entries()].sort((a, b) => b[1] - a[1]);
  const standings = new Map<string, number>();

  if (winnerId) {
    standings.set(winnerId, 1);
  }

  let position = winnerId ? 2 : 1;
  let index = 0;
  while (index < ordered.length) {
    const round = ordered[index][1];
    const tied = ordered.filter(([, value]) => value === round);
    for (const [id] of tied) {
      standings.set(id, position);
    }
    position += tied.length;
    index += tied.length;
  }

  return standings;
}
