# Board appearance system

A board is no longer dressed by a single whole-board skin. It is assembled from
independently chosen **parts**, one per category, in the style of a kart
customiser: the config screen shows a row of category columns and steps through
each category with an arrow above and below.

## Contract

| Module | Responsibility |
| --- | --- |
| `src/features/skins/types.ts` | Asset roles, part value shapes, unlock rules. |
| `src/features/skins/palettes.ts` | Colour palettes and tints, plus the generated stylesheet. |
| `src/features/skins/parts.ts` | The option catalog for every asset slot and the per-game resolver. |
| `src/features/skins/presets.ts` | Named part selections. Internal only: they supply the defaults and the v1 migration target. |
| `src/features/skins/skins.ts` | Public API: defaults, sanitising, unlocks, resolution. |
| `src/features/skins/AppearanceView.tsx` | The `#/appearance` screen. |
| `src/features/skins/BoardPreview.tsx` | The static board miniature. |

`useGameSkin(gameId)` returns a **resolved** skin whose `assets` object has the
same stable roles as before. Components consume roles only. They must never
inspect a part id, a preset id, or a palette id, and must never embed an asset
path.

## Part kinds

- **board** (stored as `palette`) — the whole surface treatment: CSS custom
  properties for light and dark, plus any chrome that travels with it. XP
  Classic also brings the pixel clue tiles and replaces the status bar, which is
  why the part is called Board rather than Palette. `BoardExtras` is the place
  to add textures and further chrome.
- **tint** — a second, narrower colour part layered over the palette. Only
  Lights (bulb colour) and Zip (arrow colour) have one.
- **asset** — a slice of the resolved asset map. Listed per game below.

| Game | Asset slots |
| --- | --- |
| Queens | Queen asset |
| Tango | Sun asset, Moon asset |
| Lights | Lightbulb asset |
| Tracks | Pipe asset, Liquid texture |
| Zip | Background image |
| Mine Islands | Mine asset, Flag asset |
| MiniChess | Pawn, Knight, Bishop, Rook, Queen, King |

Mine and flag are independent slots, but the detonated mine and the
struck-through mine are *not*: both are variants of the mine you picked, so they
travel with it instead of being chosen separately.

`gameSlots(gameId)` flattens colour and asset parts into one uniform list of
columns, so the config screen needs no per-part branching. Column order is the
colour parts followed by `GAME_PART_ORDER`.

Adding an option is a data and asset change; adding a slot means extending
`GamePartValues`, the catalog, and that game's entry in `PART_RESOLVERS`, which
the compiler enforces.

## Appearance screen

Board appearance lives at `#/appearance`, not in Config. Config keeps only the
accessibility and gameplay preferences.

The page is centred: a rack of category columns with the reset button beneath,
then the board preview at the bottom. The rack stays on the neutral app surface
— only `.appearance-preview` carries the board and tint attributes, so choosing
a board recolours the board and not the screen you are choosing it on. The rack scrolls horizontally when it outgrows the page —
`.kart-track` is `width: max-content; margin-inline: auto`, which centres while
it fits and scrolls once it does not, rather than clipping the first column the
way `justify-content: center` on a scroll container would.

Each column is a `role="group"` labelled by its category heading, with a fixed
frame that never resizes between options so stepping does not reflow the row.
The two arrow buttons are the only controls; the frame itself is focusable and
answers the arrow keys, and the current value is an `aria-live` region.

Locked options are skipped rather than shown as dead stops, so every arrow press
always changes the board; a badge on the frame reports how many remain locked.

There is no preset picker. `presets.ts` still exists because the first entry per
game defines that game's defaults and because the v1 migration maps a stored
skin id onto one.

## Board preview

`BoardPreview` draws a static 4x4 miniature from the same CSS tokens and asset
roles the real renderers consume. It is deliberately **not** the game renderer:
it needs no puzzle, no PixiJS, and no state, so a choice is visible the instant
it is made and the screen stays cheap.

Every preview includes the status bar, because the bar belongs to the board: the
XP Classic board replaces it with pixel digits and a face, and future boards are
expected to do the same. The bar mirrors `drawSuiteHud` and `drawXpHud` in
`CanvasBoard` — three metric columns (Timer, Best, and a per-game third) with
dividers and an accent rule. Keep the two in step when either changes.

The Queens preview is a real 4x4 board: four regions, one queen per row, column,
and region, and no two touching even diagonally. Mine Islands shows clue numbers,
drawn from the board's clue tiles when it brings them and as classic-coloured
numerals when it does not.

Each game supplies its own cell map and sprite placement — regions for Queens,
givens for Tango, lit cells for Lights, an SVG route for Zip and Tracks, covered
and revealed cells plus both failure sprites for Mine Islands, checkered squares
for MiniChess. Two details are worth knowing:

- **Tracks** animates the flow as a dashed stroke whose offset moves, rather
  than running the real particle system. It is disabled under reduced motion and
  only appears when a liquid other than Empty is selected.
- **Lights** recolours the lit bulb to the chosen tint using `mix-blend-mode:
  color` over a mask of the sprite's own alpha. The artwork supplies luminosity,
  the tint supplies hue, so one sprite serves every bulb colour and no per-colour
  variants are needed. The Pixi renderer does not do this yet; `LightsCanvas`
  needs the equivalent `sprite.tint` from `--glow`.

The Zip preview masks the background image with the route stroke, which is the
same idea the real scene uses at full size.

Adding a game means adding a case to the switch; the compiler will not catch a
missing one, so check the preview when a new game lands.

## Colour is data, not CSS

`paletteStyleSheet()` turns every palette and tint into rules that `SkinProvider`
injects into one `<style>` element. `game-skins.css` keeps only the per-game base
tokens and the board treatments that consume them.

Layering is by selector specificity rather than `!important` or source order:

```text
[data-game]                          0,1,0   base tokens, light
[data-theme="dark"] [data-game]      0,2,0   base tokens, dark
[data-palette]×4                     0,4,0   palette, light
[data-theme="dark"] [data-palette]×4 0,5,0   palette, dark
[data-tint]×6                        0,6,0   tint, light
[data-theme="dark"] [data-tint]×6    0,7,0   tint, dark
```

A palette therefore declares only the tokens it actually changes, and a tint
always wins over the palette beneath it. The selectors match on the attribute
alone rather than on `.suite-shell`, which is what lets the config rack carry
the same attributes and preview the real board colours. Board *treatment* rules
in `game-skins.css` keep their `.suite-shell` prefix; only the token blocks were
loosened. Pixel-art options set `pixelated` on the
option, which raises `data-pixelated` on the shell and disables canvas smoothing.

## File layout

```text
public/games/<game-id>/
  parts/<slot-or-family>/     assets added for the part system
  skins/<legacy-pack>/        assets that arrived as a whole pack
```

Names describe roles rather than appearance. Use optimized PNG or WebP for raster
sprites, SVG for vectors, and either SVG or a raster image with at least 1024
pixels on its shortest side for Zip background artwork. Transparent gameplay
sprites should normally be 384 pixels or smaller. Do not bake labels into
artwork, and record every third-party asset in [assets.md](assets.md).

## Zip background artwork

The PixiJS scene scales one image proportionally to cover the complete board and
masks it with the visited route. Every segment therefore reveals the pixels at
its exact position in the source image while unvisited portions of each cell keep
the normal board surface. Rounded caps and joins make the reveal continuous
through endpoints and corners without generating size-specific files. On
completion, the mask expands outward from the route until the complete image
fills the board; reduced-motion preferences skip directly to the final frame.

## Board material

A board is normally a set of colour tokens. Every game also has four boards —
Carved stone, Royal marble, Chess club, Arcade — that carry `extras.surface`,
which is what makes them detailed rather than merely recoloured:

```ts
surface: { cellTexture: "/games/queens/skins/quarry/surface.svg",
           bevel: "carved", edgeColor: "#4a443c" }
```

The texture is drawn *over* the region fill, never instead of it, and is
authored as neutral shading — black and white at low alpha, plus the odd metal
hairline. That is the whole trick: one stone tile serves all ten regions,
because the colour underneath still says which region a cell belongs to and the
artwork only supplies the material. A texture with a hue of its own would
collapse the ten regions into one, which is the single thing a Queens board
cannot do.

`bevel` lights the cell edges — `raised` from the top left, `carved` inverted so
cells read as cut into the surface. `edgeColor` recolours the heavy region
outline, which is how mortar, gold inlay, and brass edging are done.

Surface artwork declares a 256px intrinsic size regardless of its viewBox.
PixiJS rasterises an SVG once at its declared size and then scales the texture,
so art declared at its natural 16 or 64 units would arrive at the cell already
blurred. The Arcade tiles additionally use `shape-rendering="crispEdges"` and
set `pixelated` on the palette, so the upscale stays blocky.

Every canvas draws the surface through one shared helper,
`drawCellSurface` in `shared/canvas/surface.ts`, called immediately after each
game fills a cell with its own colour. `PlayerBoard` in multiplayer applies the
same texture and edge colour through CSS, so a spectated board matches the board
its owner is playing.

### One material, seven games

The four materials are defined once in `MATERIALS` and shared. A material offers
shades by *role* — `base`, `alt`, `deep`, `contra`, `frame` — rather than by any
one game's token names, and each game maps those roles onto its own tokens in
`SURFACE_TOKENS`:

```ts
tango: (s) => ({ "--board-cell": s.base, "--board-given": s.deep }),
```

Only surface tokens are replaced. A game's *meaningful* colours — which symbol
is which, where a hazard is, the route in Zip — are inherited from its base board
untouched. That is the line the design holds: a material may change what a board
is made of, never what it tells you.

`contra` exists because chess is not a grid game. Grid games want `alt`, a
neighbouring shade; chess needs its two squares far apart, and taking the
neighbour gave 1.8:1 where the hand-authored chess boards manage 3.2:1.

Lights' walnut and MiniChess's walnut and marble boards were re-cut in the
matching material rather than gaining near-identical neighbours in the picker,
so those three keep their ids and names and simply became real wood and marble.

### Watch the inherited foregrounds

Swapping the surface under inherited foreground colours is where this breaks.
The first pass used mid-toned cell shades and pushed Tango symbols to 1.2:1 and
Zip's route markers to 1.1:1 against their own cells. The fix belonged in the
material, not in each game: light-theme shades were made paler and dark-theme
ones deeper, which restored every game at once.

When adding a material, compare it against the hand-authored boards rather than
against an absolute number — the useful question is whether the generated board
is worse than the ones already shipping, not whether it clears some threshold the
existing boards never did either.

### The skin does not stop at the canvas

A material board also sets the frame tokens — `--game-page`, `--game-surface`,
`--game-elevated`, `--game-border`, `--game-text`, `--game-muted`, `--game-grid`
— which is what `game-frame.css` styles the header row, progress track, action
buttons and rules panel from. Without them a carved stone board sat inside a
default grey page and the skin visibly stopped at the edge of the board.

These live on `MaterialShades.chrome` and are emitted by `materialBoard` for
every game, because the frame tokens are game-agnostic: no game has to opt in.
Queens is routed through the same function with an empty token map, so it keeps
its hand-written region colours and still gets the shared chrome.

Text and muted are checked at 4.5:1 against both surface and page, and accent at
3:1 against surface, on all four materials in both themes.

The chrome takes the material's **colour only**. Texturing it was tried and
removed: tiling the board's own grain across the page, panels and buttons made
the whole screen read as one undifferentiated surface, and the board stopped
looking like an object sitting on a page. If the material is everywhere, nothing
is made of it. Texture belongs to the board and its status bar; the furniture
around them is plain.

The layering that matters is **page -> card -> board**, not page -> board. Every
game's board sits inside `.game-surface`, so the page never touches it. Checking
page against board cells measures a pair that never meet, and cost a detour
before that was noticed. The real requirement is that each step of the chain is
visible: the card lifts off the page, and the board lifts off the card. All 56
board/theme combinations are checked for both, which is how the marble board was
caught sitting 1.08 from its own card.
