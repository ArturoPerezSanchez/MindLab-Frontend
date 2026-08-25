# Multiplayer

Elimination races on a shared board. Queens first; the game id is a field rather
than an assumption so adding a second game is data plus a validator.

This document is the shared design record for the feature and is kept
identical in both repositories (`backend/docs/multiplayer.md` and
`frontend/docs/multiplayer.md`), since the two sides implement one contract.
Change the doc and the protocol together.

## The spec, verbatim

This is the product owner's original request. Everything below "Decisions" and
"Design notes" resolves how it is built; this section is the source of truth for
*what* it must do.

1. At first it will be just for Queens.
2. A game can have up to 8 players (make this number easy to increase in the
   future).
3. All players will have the same copy of the board.
4. Each player will have their board on the main screen to play, and in a small
   side they can see other players' boards.
5. Once all players completed the board, the last one (the one who took more
   time) will be eliminated, and a new board will be generated for the rest of
   the players until only 1 remains, the winner.
6. After a player completes the board, they pass to spectator mode this round
   and can see other players playing in the main screen (and use arrows to
   switch between players to spectate).
7. Once a round starts a 180 seconds countdown (configurable) will start; when
   it gets to 0, all players who could not complete the board will be
   eliminated.
8. The hint, new game, and solution buttons will NOT be available in
   multiplayer mode.
9. Right when the game starts, it will show you the board with a 3 second
   countdown (synchronized in all boards), and then you will be able to play,
   not before.
10. When a player is watching other players' boards (either in the main screen
    spectator mode, or in the side), they will see the skins that each player
    is using in their game.
11. At first the lobbies will be created as many other web games: a person
    hosts a game, and people can join using a code. The game starts when the
    host clicks play (even if the lobby is not full). In the future, a
    matchmaking queue.
12. When a player is eliminated they can spectate next rounds, or leave the
    lobby. If they stay as spectator, when all the rounds end they are added
    back to the same lobby.
13. If the host leaves the game, it must continue working for other players.
    Games run on our server to avoid that class of problem entirely.
14. Every player (including guests) has ELO, adjusted after each game by final
    position. On elimination, the player sees their ELO change in a small
    animation. ELO will later drive the matchmaking queue.
15. The player profile view shows stats, including online ELO.

## Decisions

These were open questions. They are settled here so the protocol has something
to encode.

**The server owns the game.** Rooms live in the backend, not on the host's
machine. A host leaving is an ordinary disconnect and play continues, which is
requirement 13. It also decides requirement 14: the server measures completion
times, so eliminations and ratings rest on something a client cannot fake. Host
authority would have given away both. Rooms are run **locally only** for this
iteration — the API is not deployed anywhere; `dev.ps1` / `dev.cmd` bring it up
on `127.0.0.1`.

**Clients never claim to have won.** A player sends the placements they believe
solve the board; the server validates against the puzzle it generated and stamps
the time itself. There is no "I finished" message to forge. Every generated
Queens board is checked for a unique solution already (`games/queens.py`), so
validating a submission is exactly "does this set of cells equal the solution
set" — no need to re-run the adjacency/region rules server-side.

**Guests are rated, provisionally.** Guests play and carry a rating, keyed by a
client-generated `guestId` persisted in `localStorage`, but it is marked
provisional and kept out of public leaderboards, because a guest can clear
storage to discard a bad result. Registering later would let a person carry
their guest rating forward by matching `guestId`; that migration is not built
yet (see "Still to build"). This keeps guest games meaningful without making the
ladder farmable.

**Rooms start in process.** Room state lives in the server's memory to begin
with: no new infrastructure, one instance, and a restart drops games in flight.
That is an acceptable trade for a locally-run feature, and the store sits behind
a small interface (`RoomRegistry`) so moving to Redis later is a swap rather
than a rewrite. It does mean the backend cannot be deployed to a serverless
target — a long-lived process is required — which matches the decision above to
not deploy this at all yet.

**One WebSocket endpoint, no separate "create room" REST call.** `POST` isn't
needed: a client opens a socket to `/api/v1/multiplayer/ws` and sends `join`
with `code: null` to create a room (becoming its host) or `code: "ABC123"` to
join an existing one. This keeps the whole feature behind one transport and one
message contract instead of splitting lobby creation from lobby life.

**Progress has two grades, and who you are decides which you get.** Watching a
rival's board while you are still racing is not exciting, it is cheating: their
queens are your answers, because everyone is solving the same board. So the
client sends its placements, and the server splits them.

- **Counts** — queens placed, how many are on solution squares, how many are
  not — go to everyone. They convey pace and pressure and reveal nothing about
  position. Because everyone sees only their rivals' counts and never their own,
  the numbers cannot be used as a hint system either: watching your own
  "correct" tick up as you place would solve the board for you.
- **Cells** go out in a separate `board` message, and only to players the server
  has already taken out of the round — someone who has solved it, or who is
  eliminated. They have nothing left to gain, so requirement 6 is satisfied in
  full: spectators watch real boards, live.

The counts are computed server-side from the placements, not reported by the
client, for the usual reason — a client that scores itself can lie. The split is
enforced in `broadcast_to_spectators`, which is the only path board contents
ever travel down.

**A round ends when one racer is left, not when the last one finishes.** If
everyone else has resolved, the result is already decided: the remaining player
is last. Making them play out a race they have lost only wastes the room's time,
so `compute_round_outcome` eliminates them there. The exception is a field that
thinned out through quitting rather than solving — "last one still going" only
means "last" if somebody actually beat them, so a survivor whose rivals all
walked out stays in.

**Leaving is losing.** A leave or a dropped connection in any non-lobby phase
records an elimination round, so the player takes a standing and is rated on it.
Walking out of a game you are losing should cost what losing it costs.

**The board is generated before the countdown, not after it.** Requirement 9
asks that players *see* the board while the three seconds run down, which is
only possible if it exists when the countdown is announced. The generator
therefore runs inside `_start_round`, before the phase flips to `countdown`, and
`_begin_playing` only stamps the start time. This also keeps the countdown
honest: the wait is exactly three seconds rather than three seconds plus
however long the generator happened to take. Generation runs on a worker thread
while the room lock is held, so the event loop stays free and the room stays
consistent. A `starting` flag claims the room between the host pressing Start
and the first countdown appearing, because the room is still in `lobby` during
that window and a double-clicked button would otherwise start two rounds.

**Elimination has two independent triggers.** Re-reading requirements 5 and 7
together: a round can end because everyone still playing finished (then the
single slowest finisher is eliminated), or because the clock ran out (then
everyone still without a solution is eliminated, which can be more than one
person). These are mutually exclusive within a round — a round that ends by
timeout does not also remove a "slowest finisher", because timeout already
removed everyone who didn't finish.

**Disconnects during an active round are an immediate forfeit.** Full
reconnect-and-resume (restoring a mid-round board after a refresh) is listed
under "Still to build". For now, a dropped connection while the round is
`playing` marks that player eliminated this round (same bucket as a timeout).
A disconnect during `lobby` just removes them from the roster. A disconnect
during `results`/`finished` is harmless. Rejoining a room *is* supported: a
`join` with the same `code` and matching identity (`token`'s user id, or
`guestId`) re-attaches to the existing player record rather than creating a
new one, which covers a refresh during the lobby or while spectating.

**Host is a lobby-only role.** `hostId` only gates who can click Start or
change room settings before a game begins. It has no run-time authority once
the game starts, and if the host disconnects mid-lobby the next connected
player is promoted automatically so the room is never stuck without one.

**Matchmaking queue is out of scope for this pass.** Requirement 11 asks for it
"in the future"; this pass only builds code-based lobbies, but persists ELO
(requirement 14) specifically because matchmaking will need it later.

## Round lifecycle

```text
lobby ──host starts──▶ countdown(3s) ──▶ playing(180s) ──▶ results ──▶ countdown …
                                                                          │
                                                              one player left
                                                                          ▼
                                                                      finished
```

- **lobby** — players join with a code, see the roster and each other's skins,
  and the host can tweak `roundSeconds` / `maxPlayers` / `boardSize` before
  starting.
- **countdown** — the board for the new round is already visible and input is
  refused. `startsAt` is a server timestamp; every client counts down to the
  same instant, and each `state` carries `serverTime` so clients can correct for
  clock drift (requirement 9).
- **playing** — ends when everyone still in the round has finished, or when
  `endsAt` passes, whichever comes first (requirement 7).
- **results** — shows who went out this round and the standings so far, then
  the server starts the next round automatically after a short pause. No host
  action is needed between rounds — the spec only gives the host control over
  *starting the game*, not each round within it.
- **finished** — one player remains (the winner), or, in the rare case a whole
  round eliminates everyone still playing, nobody does. Rating changes are
  computed once here, from the elimination order of the entire game, and sent
  to every player (requirement 14). Eliminated players who chose to spectate
  return to this room's lobby (requirement 12).

Hint, new game, and solution are absent in multiplayer (requirement 8) — the
client's race view never renders them, and the server has no route that would
honor them even if a client tried.

## Rating

Same formula on both sides of the contract: `backend/app/services/multiplayer/elo.py`
(authoritative — the server computes and persists it) and
`frontend/src/features/multiplayer/elo.ts` (used to drive the on-screen
animation from the `before`/`after` values the server sends, not to compute
them independently).

An N-player result is scored as every pairing played at once: each player is
compared with every other, and their rating moves by the average of those
pairwise outcomes. Standard Elo properties survive — beating a stronger field
gains more, an even table is zero-sum — without a bespoke formula. Players
eliminated in the same round tie, which is what a shared timeout should mean.
K is 40 while provisional (fewer than 10 rated games) and 24 afterwards, and
ratings floor at 100.

Ratings persist in the `elo_ratings` table (already migrated in, previously
unused) keyed by `(user_id, mode)` for accounts and `(guest_key, mode)` for
guests, with `mode = "queens"` — a future second multiplayer game gets its own
mode string and its own ladder, exactly as the migration's comment intended.

## Spectating

Each `RoomPlayer` carries its owner's `skin` — the same flat
`Record<partId, optionId>` the appearance screen writes — so a spectator renders
every board in its owner's own parts (requirement 10) with no extra round trip.
Resolution happens client-side through `resolveGameSkin`, exactly as in single
player.

The side rail (requirement 4) is a card per rival: their marker asset drawn from
their own selections, their rating in parentheses, and their live counts. Your
own card is not in it — you are looking at your board, you do not need a summary
of it. No board appears in the rail at any point, because the rail is visible
while you are still racing.

The main-screen spectator view (requirement 6) is only reachable once your round
is over, which is exactly when the server starts sending you `board` messages.
It picks one player at a time, arrow keys cycle through them, and it says
plainly that it is spectator mode: a banner, a tinted dashed frame around the
stage, and the board controls gone. Solving the board plays the same win
celebration the single-player board does, and only when that finishes does the
stage hand over to spectating.

A player becomes a spectator *of the current round* the instant they finish it
(`status: "finished"`), distinct from `status: "eliminated"`, which is a
spectator of the *rest of the game* who was asked, and chose, to stay
(requirement 12). Both look the same in the UI; the difference is only whether
they return to "playing" next round.

## The client

One socket, one room, and a pure reducer between them:

| Module | Role |
| --- | --- |
| `protocol.ts` | The wire contract. Mirrors `rooms.py`; change them together. |
| `roomState.ts` | `roomReducer` plus selectors. No React, no socket, so the round-boundary and clock rules are directly testable (`roomState.test.ts`). |
| `useMultiplayerRoom.ts` | Owns the WebSocket. Joining is an explicit call, never an effect, because `code: null` *creates* a room and an effect would spawn one per re-mount in development. |
| `MultiplayerView.tsx` | Route shell: entry screen, then lobby or race. |
| `LobbyView.tsx` | Code, roster, host-only settings (requirement 11). |
| `RaceView.tsx` | Stage, side rail, countdown, results and end-of-game overlays. |
| `RaceBoard.tsx` | The player's own board. The single-player board minus hint, solution, and new game (requirement 8), plus the win celebration. |
| `PlayerBoard.tsx` | A read-only board in *its owner's* skin (requirement 10), shown only in spectator mode. Plain DOM, not PixiJS: it redraws on every `board` broadcast, and a second WebGL context would not be free. |
| `ChatPanel.tsx` | Room chat, in the lobby and in the rail during a race. |
| `EloChangeBadge.tsx` | Animates between the server's `before` and `after`. It never computes a rating. |

Chat is available during a race, not only in the lobby, because the people most
likely to want to talk are the ones who have already finished and are watching.

`elo.ts` is not called by any of them. It exists so the formula is legible on
both sides of the contract and stays in step with the server's, but the numbers
on screen are always the ones the server sent.

The transport needs two pieces of plumbing that a REST-only client did not:
`ws: true` on the Vite dev proxy, and `Upgrade`/`Connection` headers on the
nginx `/api/v1/` location. Without either, the upgrade is answered with an
ordinary HTTP response and the socket never opens.

### Where this bends the spec

Requirement 14 asks for the rating animation "when you get eliminated". It plays
at the end of the game instead, for every player at once. Elo for an N-player
table is a function of the *final* standings, so a delta shown at the moment of
elimination would be a guess that later rounds could contradict. An eliminated
player who stays to spectate sees their real change when the game ends; one who
leaves immediately does not see it at all, though it is still applied and shows
on their profile.

## Still to build

Reasonable scope cuts for a locally-run first pass, tracked here so they are a
choice and not an oversight:

- Full reconnect-and-resume mid-round (a refresh mid-round is currently a
  forfeit, not a resume).
- Carrying a guest's provisional rating into a real account on registration.
- Automated matchmaking (requirement 11) — this pass only builds ELO, which
  matchmaking will need.
- A shared `RoomRegistry` store (Redis or similar) for running more than one
  API process; today's in-memory registry is fine for one local instance.
- Component tests. The reducer and the elimination rules are covered on both
  sides; the views are not, because the suite has no jsdom or Testing Library
  yet and adding them for this alone was not worth the weight.
- A profile appearance picker. `portraitId` travels with the roster and is
  drawn in the lobby and the rail, but nothing lets a player choose one yet, so
  everyone shows the default.
- A second race game. `gameId` is a real, host-settable room setting and the
  lobby lists the other six plus a "mixed" mode, all disabled. Enabling one
  needs a generator and a submission validator per game; the protocol already
  carries the field.
- Chat moderation. Length and a flood interval are enforced server-side; there
  is no filtering, muting, or history beyond the last 120 messages in memory.
