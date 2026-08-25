# Third-party gameplay assets

MindLab keeps downloaded source artwork inside the owning game's `skins/`
directory. Assets are served locally at runtime; the application does not
depend on third-party CDNs.

| Game | Asset | Source | License |
| --- | --- | --- | --- |
| Tango sun/moon (Line) | Sun and moon SVGs | [Lucide icons](https://github.com/lucide-icons/lucide) | ISC |
| Tango sun/moon (Sun face, Crescent, Fire, Water) | Sun, moon, water, and fire SVGs | [Google Noto Emoji](https://github.com/googlefonts/noto-emoji) | Apache-2.0 |
| Queens marker (Rose) | Rose SVG | [Google Noto Emoji](https://github.com/googlefonts/noto-emoji) | Apache-2.0 |
| Mine Islands mine (Survey) | Bomb and flag SVGs | [Google Noto Emoji](https://github.com/googlefonts/noto-emoji) | Apache-2.0 |
| Mine Islands XP Classic board and mine | Minefield tiles, faces, counters, and flag sprites | [ShizukuIchi/winXP](https://github.com/ShizukuIchi/winXP/tree/master/src/assets/minesweeper) | MIT; Windows artwork and trademarks belong to Microsoft |
| Lights bulb (Orb) | Yellow and grey ball sprites | [Kenney Puzzle Pack 2](https://kenney.nl/assets/puzzle-pack-2) | CC0 1.0 |
| Tracks pipe (Transit) | Grey junction sprite | [Kenney Puzzle Pack 2](https://kenney.nl/assets/puzzle-pack-2) | CC0 1.0 |
| Tracks pipe/liquid (Coolant, Conduit, Energy) | Ring, star, and energy trace sprites | [Kenney Particle Pack](https://kenney.nl/assets/particle-pack) | CC0 1.0 |
| Zip background (Spanish flag) | Flag of the Kingdom of Spain by Antonio Valdes y Fernandez Bazan | [Wikimedia Commons file](https://commons.wikimedia.org/wiki/File:Bandera_de_Espa%C3%B1a.svg) | Public domain; official-insignia restrictions may apply |
| MiniChess pieces (Club) | Cburnett chess pieces by Colin M. L. Burnett | [Wikimedia Commons](https://commons.wikimedia.org/wiki/Category:SVG_chess_pieces) | GPL/GFDL/BSD variants; see the game attribution file |
| MiniChess pieces (Celtic, Fantasy, Spatial) | Chess pieces by Maurizio Monge | [Chess Art](https://github.com/maurimo/chess-art) via [Lichess](https://github.com/lichess-org/lila/tree/master/public/piece) | MIT |
| MiniChess pieces (Chessnut) | Chess pieces by Alexis Luengas | [Chessnut Pieces](https://github.com/LexLuengas/chessnut-pieces) via [Lichess](https://github.com/lichess-org/lila/tree/master/public/piece/chessnut) | Apache-2.0 |
| MiniChess pieces (Firi) | Chess pieces by James Faure | [Lichess](https://github.com/lichess-org/lila/tree/master/public/piece/firi) | CC BY 4.0 |
| MiniChess pieces (Kiwen Suwi) | Chess pieces by neverRare | [Lichess](https://github.com/lichess-org/lila/tree/master/public/piece/kiwen-suwi) | CC BY 4.0 |
| MiniChess pieces (RhosGFX) | Vector Ranks chess pieces by RhosGFX | [RhosGFX](https://rhosgfx.itch.io/vector-chess-pieces) via [Lichess](https://github.com/lichess-org/lila/tree/master/public/piece/rhosgfx) | CC0 1.0 |

| Queens marker (Crown, Star, Gem) | `public/games/queens/parts/*.svg` | Original artwork for MindLab | Project licence |
| Tango sun (Rayed sun, Leaf) | `public/games/tango/parts/sun-rays.svg`, `leaf.svg` | Original artwork for MindLab | Project licence |
| Tango moon (Full moon, Droplet) | `public/games/tango/parts/moon-craters.svg`, `droplet.svg` | Original artwork for MindLab | Project licence |
| Lights bulb (Filament bulb, Lantern) | `public/games/lights/parts/**` | Original artwork for MindLab | Project licence |
| Tracks pipe (Brass) | `public/games/tracks/parts/node-brass.svg` | Original artwork for MindLab | Project licence |
| Mine Islands mine (Naval) | `public/games/mine-islands/parts/mine.svg`, `buoy.svg` | Original artwork for MindLab | Project licence |
| Mine Islands blast (Detonation) | `public/games/mine-islands/parts/blast.svg`, `misflagged.svg` | Original artwork for MindLab | Project licence |
| Queens marker (Chess queen, Lotus) | `public/games/queens/parts/chess-queen.svg`, `lotus.svg` | Original artwork for MindLab | Project licence |
| Tango sun (Daisy, Bolt) | `public/games/tango/parts/daisy.svg`, `bolt.svg` | Original artwork for MindLab | Project licence |
| Tango moon (Snowflake, Night star) | `public/games/tango/parts/snowflake.svg`, `star-night.svg` | Original artwork for MindLab | Project licence |
| Lights bulb (Candle, Neon tube) | `public/games/lights/parts/candle/**`, `neon/**` | Original artwork for MindLab | Project licence |
| Tracks pipe (Hex coupling) | `public/games/tracks/parts/node-hex.svg` | Original artwork for MindLab | Project licence |
| Mine Islands mine (Crystal) | `public/games/mine-islands/parts/crystal/**` | Original artwork for MindLab | Project licence |
| Zip background (Aurora, Circuit, Sunrise) | `public/games/zip/parts/*.svg` | Original artwork for MindLab | Project licence |

The original source URLs and license names must remain in this table when an
asset is optimized, renamed, or moved. New packs should prefer CC0, permissive
open-source icon sets, or assets whose redistribution terms explicitly permit
bundling in the application.

Assets marked *Original artwork for MindLab* are hand-authored SVGs written for
this repository. They carry no third-party terms and may be edited freely.
