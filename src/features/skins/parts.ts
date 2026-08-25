import type { GameId } from "@/shared/gameOptions";
import type {
  AssetPart,
  AssetParts,
  ChessPieceSource,
  GamePartValues,
  GameSkinAssetMap,
  PartOption,
} from "./types";

const STARTER = { type: "starter" } as const;

/* ------------------------------------------------------------------ chess -- */

/**
 * Every piece slot offers the same set of source directories, so the catalog is
 * generated instead of repeated six times. Mixing a Fantasy knight with a Club
 * rook is the whole point of splitting the set.
 */
const CHESS_SETS = [
  { id: "club", name: "Club", description: "Tournament standard." },
  { id: "celtic", name: "Celtic", description: "Ornate and dimensional." },
  { id: "chessnut", name: "Chessnut", description: "Clean rounded silhouettes." },
  { id: "fantasy", name: "Fantasy", description: "Expressive medieval profiles." },
  { id: "firi", name: "Firi", description: "Bold and compact." },
  { id: "kiwen-suwi", name: "Kiwen Suwi", description: "Minimal geometric shapes." },
  { id: "rhosgfx", name: "RhosGFX", description: "Friendly outlined shapes." },
  { id: "spatial", name: "Spatial", description: "Sculptural and asymmetric." },
] as const;

function chessPart(
  label: string,
  letter: "p" | "n" | "b" | "r" | "q" | "k",
): AssetPart<ChessPieceSource> {
  return {
    label,
    hint: "Mix and match sets piece by piece.",
    options: CHESS_SETS.map((set) => ({
      id: set.id,
      name: set.name,
      description: set.description,
      preview: {
        sources: [
          `/games/mini-chess/skins/${set.id}/w${letter}.svg`,
          `/games/mini-chess/skins/${set.id}/b${letter}.svg`,
        ] as [string, string],
        presentation: "pair",
      },
      unlock: STARTER,
      value: { root: `/games/mini-chess/skins/${set.id}`, extension: "svg" },
    })),
  };
}

/* ----------------------------------------------------------------- catalog -- */

function part<V>(
  label: string,
  hint: string,
  options: readonly PartOption<V>[],
): AssetPart<V> {
  return { label, hint, options };
}

const QUEENS_PARTS: AssetParts<"queens"> = {
  marker: part("Queen asset", "The piece you place on the board.", [
    // The four detailed markers pair with the boards of the same name, but the
    // parts stay independent - nothing stops an iron queen on the arcade board.
    {
      id: "iron",
      name: "Wrought iron",
      description: "A hammered iron queen with pitting and a lichen patina.",
      preview: { sources: ["/games/queens/skins/quarry/marker.svg"], presentation: "contain" },
      unlock: STARTER,
      value: { marker: "/games/queens/skins/quarry/marker.svg" },
    },
    {
      id: "coronet",
      name: "Jewelled coronet",
      description: "Gold filigree arches over a velvet cap, set with stones.",
      preview: { sources: ["/games/queens/skins/regalia/marker.svg"], presentation: "contain" },
      unlock: STARTER,
      value: { marker: "/games/queens/skins/regalia/marker.svg" },
    },
    {
      id: "staunton",
      name: "Walnut queen",
      description: "A turned tournament queen with lathe rings and a felt base.",
      preview: { sources: ["/games/queens/skins/timber/marker.svg"], presentation: "contain" },
      unlock: STARTER,
      value: { marker: "/games/queens/skins/timber/marker.svg" },
    },
    {
      id: "pixel-crown",
      name: "Pixel crown",
      description: "A 16-bit crown drawn on whole pixels, jewels and all.",
      preview: { sources: ["/games/queens/skins/arcade/marker.svg"], presentation: "contain" },
      unlock: STARTER,
      pixelated: true,
      value: { marker: "/games/queens/skins/arcade/marker.svg" },
    },
    {
      id: "royal",
      name: "Royal",
      description: "The original crown marker.",
      preview: { sources: ["/games/queens/queen.png"], presentation: "contain" },
      unlock: STARTER,
      value: { marker: "/games/queens/queen.png" },
    },
    {
      id: "rose",
      name: "Rose",
      description: "An open bloom in place of a queen.",
      preview: { sources: ["/games/queens/skins/garden/rose.svg"], presentation: "contain" },
      unlock: STARTER,
      value: { marker: "/games/queens/skins/garden/rose.svg" },
    },
    {
      id: "crown",
      name: "Crown",
      description: "A jewelled coronet with a heavy band.",
      preview: { sources: ["/games/queens/parts/crown.svg"], presentation: "contain" },
      unlock: STARTER,
      value: { marker: "/games/queens/parts/crown.svg" },
    },
    {
      id: "star",
      name: "Star",
      description: "A flat five-point star that reads at any board size.",
      preview: { sources: ["/games/queens/parts/star.svg"], presentation: "contain" },
      unlock: STARTER,
      value: { marker: "/games/queens/parts/star.svg" },
    },
    {
      id: "gem",
      name: "Gem",
      description: "A faceted stone with a cool highlight.",
      preview: { sources: ["/games/queens/parts/gem.svg"], presentation: "contain" },
      unlock: STARTER,
      value: { marker: "/games/queens/parts/gem.svg" },
    },
    {
      id: "chess-queen",
      name: "Chess queen",
      description: "A coronet-topped tournament queen.",
      preview: { sources: ["/games/queens/parts/chess-queen.svg"], presentation: "contain" },
      unlock: STARTER,
      value: { marker: "/games/queens/parts/chess-queen.svg" },
    },
    {
      id: "lotus",
      name: "Lotus",
      description: "An open water bloom with a gold centre.",
      preview: { sources: ["/games/queens/parts/lotus.svg"], presentation: "contain" },
      unlock: STARTER,
      value: { marker: "/games/queens/parts/lotus.svg" },
    },
  ]),
};

const TANGO_PARTS: AssetParts<"tango"> = {
  sun: part("Sun asset", "The first of the two balanced symbols.", [
    {
      id: "classic",
      name: "Line sun",
      description: "The original stroked sun.",
      preview: { sources: ["/games/tango/skins/classic/sun.svg"], presentation: "contain" },
      unlock: STARTER,
      value: { symbol: { src: "/games/tango/skins/classic/sun.svg", label: "Sun" } },
    },
    {
      id: "emoji",
      name: "Sun face",
      description: "A detailed filled sun.",
      preview: { sources: ["/games/tango/skins/emoji/sun-face.svg"], presentation: "contain" },
      unlock: STARTER,
      value: { symbol: { src: "/games/tango/skins/emoji/sun-face.svg", label: "Sun" } },
    },
    {
      id: "fire",
      name: "Fire",
      description: "A flame for elemental boards.",
      preview: { sources: ["/games/tango/skins/elements/fire.svg"], presentation: "contain" },
      unlock: STARTER,
      value: { symbol: { src: "/games/tango/skins/elements/fire.svg", label: "Fire" } },
    },
    {
      id: "rays",
      name: "Rayed sun",
      description: "A bold disc with separated rays.",
      preview: { sources: ["/games/tango/parts/sun-rays.svg"], presentation: "contain" },
      unlock: STARTER,
      value: { symbol: { src: "/games/tango/parts/sun-rays.svg", label: "Sun" } },
    },
    {
      id: "leaf",
      name: "Leaf",
      description: "A single leaf for botanical boards.",
      preview: { sources: ["/games/tango/parts/leaf.svg"], presentation: "contain" },
      unlock: STARTER,
      value: { symbol: { src: "/games/tango/parts/leaf.svg", label: "Leaf" } },
    },
    {
      id: "daisy",
      name: "Daisy",
      description: "White petals around a gold eye.",
      preview: { sources: ["/games/tango/parts/daisy.svg"], presentation: "contain" },
      unlock: STARTER,
      value: { symbol: { src: "/games/tango/parts/daisy.svg", label: "Daisy" } },
    },
    {
      id: "bolt",
      name: "Bolt",
      description: "A hard-edged lightning strike.",
      preview: { sources: ["/games/tango/parts/bolt.svg"], presentation: "contain" },
      unlock: STARTER,
      value: { symbol: { src: "/games/tango/parts/bolt.svg", label: "Bolt" } },
    },
  ]),
  moon: part("Moon asset", "The second of the two balanced symbols.", [
    {
      id: "classic",
      name: "Line moon",
      description: "The original stroked crescent.",
      preview: { sources: ["/games/tango/skins/classic/moon.svg"], presentation: "contain" },
      unlock: STARTER,
      value: { symbol: { src: "/games/tango/skins/classic/moon.svg", label: "Moon" } },
    },
    {
      id: "emoji",
      name: "Crescent",
      description: "A detailed filled crescent.",
      preview: {
        sources: ["/games/tango/skins/emoji/crescent-moon.svg"],
        presentation: "contain",
      },
      unlock: STARTER,
      value: {
        symbol: { src: "/games/tango/skins/emoji/crescent-moon.svg", label: "Moon" },
      },
    },
    {
      id: "water",
      name: "Water",
      description: "A wave for elemental boards.",
      preview: { sources: ["/games/tango/skins/elements/water.svg"], presentation: "contain" },
      unlock: STARTER,
      value: { symbol: { src: "/games/tango/skins/elements/water.svg", label: "Water" } },
    },
    {
      id: "craters",
      name: "Full moon",
      description: "A full disc with shaded craters.",
      preview: { sources: ["/games/tango/parts/moon-craters.svg"], presentation: "contain" },
      unlock: STARTER,
      value: { symbol: { src: "/games/tango/parts/moon-craters.svg", label: "Moon" } },
    },
    {
      id: "droplet",
      name: "Droplet",
      description: "A single drop with a soft highlight.",
      preview: { sources: ["/games/tango/parts/droplet.svg"], presentation: "contain" },
      unlock: STARTER,
      value: { symbol: { src: "/games/tango/parts/droplet.svg", label: "Droplet" } },
    },
    {
      id: "snowflake",
      name: "Snowflake",
      description: "A six-armed crystal.",
      preview: { sources: ["/games/tango/parts/snowflake.svg"], presentation: "contain" },
      unlock: STARTER,
      value: { symbol: { src: "/games/tango/parts/snowflake.svg", label: "Snowflake" } },
    },
    {
      id: "star",
      name: "Night star",
      description: "A four-point sparkle with companions.",
      preview: { sources: ["/games/tango/parts/star-night.svg"], presentation: "contain" },
      unlock: STARTER,
      value: { symbol: { src: "/games/tango/parts/star-night.svg", label: "Star" } },
    },
  ]),
};

const LIGHTS_PARTS: AssetParts<"lights"> = {
  bulb: part("Lightbulb asset", "The fixture drawn in every cell.", [
    {
      id: "orb",
      name: "Orb",
      description: "The original rounded lamp.",
      preview: {
        sources: [
          "/games/lights/skins/warm-glow/unlit.png",
          "/games/lights/skins/warm-glow/lit.png",
        ],
        presentation: "pair",
      },
      unlock: STARTER,
      value: {
        bulbs: [
          "/games/lights/skins/warm-glow/unlit.png",
          "/games/lights/skins/warm-glow/lit.png",
        ],
      },
    },
    {
      id: "bulb",
      name: "Filament bulb",
      description: "A classic pear bulb with a visible filament.",
      preview: {
        sources: ["/games/lights/parts/bulb/off.svg", "/games/lights/parts/bulb/on.svg"],
        presentation: "pair",
      },
      unlock: STARTER,
      value: {
        bulbs: ["/games/lights/parts/bulb/off.svg", "/games/lights/parts/bulb/on.svg"],
      },
    },
    {
      id: "lantern",
      name: "Lantern",
      description: "A hanging square lantern.",
      preview: {
        sources: ["/games/lights/parts/lantern/off.svg", "/games/lights/parts/lantern/on.svg"],
        presentation: "pair",
      },
      unlock: STARTER,
      value: {
        bulbs: ["/games/lights/parts/lantern/off.svg", "/games/lights/parts/lantern/on.svg"],
      },
    },
    {
      id: "candle",
      name: "Candle",
      description: "A wax pillar with a live flame.",
      preview: { sources: ["/games/lights/parts/candle/off.svg", "/games/lights/parts/candle/on.svg"], presentation: "pair" },
      unlock: STARTER,
      value: {
        bulbs: ["/games/lights/parts/candle/off.svg", "/games/lights/parts/candle/on.svg"],
      },
    },
    {
      id: "neon",
      name: "Neon tube",
      description: "A horizontal tube that blooms when live.",
      preview: { sources: ["/games/lights/parts/neon/off.svg", "/games/lights/parts/neon/on.svg"], presentation: "pair" },
      unlock: STARTER,
      value: {
        bulbs: ["/games/lights/parts/neon/off.svg", "/games/lights/parts/neon/on.svg"],
      },
    },
  ]),
};

const TRACKS_PARTS: AssetParts<"tracks"> = {
  pipe: part("Pipe asset", "The junction sprite and pipe casing style.", [
    {
      id: "transit",
      name: "Transit",
      description: "The original flat grey junction.",
      preview: { sources: ["/games/tracks/skins/transit/node.png"], presentation: "contain" },
      unlock: STARTER,
      value: { node: "/games/tracks/skins/transit/node.png" },
    },
    {
      id: "coolant",
      name: "Coolant",
      description: "A pale plastic junction ring.",
      preview: { sources: ["/games/tracks/skins/liquid/node.png"], presentation: "contain" },
      unlock: STARTER,
      value: { node: "/games/tracks/skins/liquid/node.png" },
    },
    {
      id: "electric",
      name: "Conduit",
      description: "A bright star junction for energy flows.",
      preview: { sources: ["/games/tracks/skins/electric/node.png"], presentation: "contain" },
      unlock: STARTER,
      value: { node: "/games/tracks/skins/electric/node.png" },
    },
    {
      id: "steel",
      name: "Machined steel",
      description: "A round casing shaded as a lit cylinder.",
      preview: { sources: ["/games/tracks/skins/crude/node.svg"], presentation: "contain" },
      unlock: STARTER,
      value: { node: "/games/tracks/skins/crude/node.svg", pipeStyle: "cylindrical" },
    },
    {
      id: "brass",
      name: "Brass",
      description: "A riveted brass flange with a cylindrical casing.",
      preview: { sources: ["/games/tracks/parts/node-brass.svg"], presentation: "contain" },
      unlock: STARTER,
      value: { node: "/games/tracks/parts/node-brass.svg", pipeStyle: "cylindrical" },
    },
    {
      id: "hex",
      name: "Hex coupling",
      description: "A bolted hexagonal collar.",
      preview: { sources: ["/games/tracks/parts/node-hex.svg"], presentation: "contain" },
      unlock: STARTER,
      value: { node: "/games/tracks/parts/node-hex.svg" },
    },
  ]),
  liquid: part("Liquid texture", "What travels through the connected pipes.", [
    {
      id: "none",
      name: "Empty",
      description: "Static pipes with no flow.",
      preview: { sources: ["/games/tracks/logo.png"], presentation: "contain" },
      unlock: STARTER,
      value: {},
    },
    {
      id: "coolant",
      name: "Coolant",
      description: "Bubbles drifting through a light fluid.",
      preview: { sources: ["/games/tracks/skins/liquid/particle.png"], presentation: "contain" },
      unlock: STARTER,
      value: {
        flowParticle: {
          src: "/games/tracks/skins/liquid/particle.png",
          material: "liquid",
          size: 0.078,
          spacing: 0.26,
          speed: 0.44,
          opacity: 0.62,
          drift: 0.026,
          flicker: 0.04,
        },
      },
    },
    {
      id: "energy",
      name: "Energy",
      description: "Live discharges racing along the network.",
      preview: {
        sources: ["/games/tracks/skins/electric/particle.png"],
        presentation: "contain",
      },
      unlock: STARTER,
      value: {
        flowParticle: {
          src: "/games/tracks/skins/electric/particle.png",
          material: "energy",
          size: 0.25,
          spacing: 0.72,
          speed: 1.05,
          opacity: 0.94,
          drift: 0.012,
          flicker: 0.55,
          rotateToPath: true,
          additive: true,
          pulseOpacity: 0.92,
        },
      },
    },
    {
      id: "oil",
      name: "Crude oil",
      description: "Heavy slugs that draw their own sheen.",
      preview: { sources: ["/games/tracks/skins/crude/droplet.svg"], presentation: "contain" },
      unlock: STARTER,
      // No sprite: the oil material draws its own body, sheen, and slugs.
      // `speed` is cells per second and `spacing` the gap between slugs.
      value: {
        flowParticle: { material: "oil", size: 0.1, spacing: 0.82, speed: 0.72, opacity: 0.95 },
      },
    },
  ]),
};

const ZIP_PARTS: AssetParts<"zip"> = {
  background: part("Background image", "Revealed continuously inside the route.", [
    {
      id: "none",
      name: "None",
      description: "Keep the plain board surface.",
      preview: { sources: ["/games/zip/logo.png"], presentation: "contain" },
      unlock: STARTER,
      value: {},
    },
    {
      id: "spain",
      name: "Spanish flag",
      description: "A flat national flag.",
      preview: { sources: ["/games/zip/skins/spain/flag.svg"], presentation: "cover" },
      unlock: STARTER,
      value: { revealImage: "/games/zip/skins/spain/flag.svg" },
    },
    {
      id: "aurora",
      name: "Aurora",
      description: "A night sky with drifting light bands.",
      preview: { sources: ["/games/zip/parts/aurora.svg"], presentation: "cover" },
      unlock: STARTER,
      value: { revealImage: "/games/zip/parts/aurora.svg" },
    },
    {
      id: "circuit",
      name: "Circuit",
      description: "Etched traces and gold pads.",
      preview: { sources: ["/games/zip/parts/circuit.svg"], presentation: "cover" },
      unlock: STARTER,
      value: { revealImage: "/games/zip/parts/circuit.svg" },
    },
    {
      id: "sunrise",
      name: "Sunrise",
      description: "A layered ridge line under a low sun.",
      preview: { sources: ["/games/zip/parts/sunrise.svg"], presentation: "cover" },
      unlock: STARTER,
      value: { revealImage: "/games/zip/parts/sunrise.svg" },
    },
  ]),
};

const MINE_ISLANDS_PARTS: AssetParts<"mine-islands"> = {
  // The detonated and struck-through sprites are not slots of their own:
  // they are variants of the mine, so they are bundled with it.
  mine: part("Mine asset", "The hidden hazard, and how it looks when struck.", [
    {
      id: "survey",
      name: "Survey",
      description: "The original bomb, with a hard detonation.",
      preview: { sources: ["/games/mine-islands/skins/survey/bomb.svg", "/games/mine-islands/parts/blast.svg"], presentation: "pair" },
      unlock: STARTER,
      value: {
        hazard: "/games/mine-islands/skins/survey/bomb.svg",
        death: "/games/mine-islands/parts/blast.svg",
        misflagged: "/games/mine-islands/parts/misflagged.svg",
      },
    },
    {
      id: "xp-classic",
      name: "XP Classic",
      description: "The desktop pixel mine and its red detonation.",
      preview: { sources: ["/games/mine-islands/skins/xp-classic/mine-ceil.png", "/games/mine-islands/skins/xp-classic/mine-death.png"], presentation: "pair" },
      unlock: STARTER,
      pixelated: true,
      value: {
        hazard: "/games/mine-islands/skins/xp-classic/mine-ceil.png",
        death: "/games/mine-islands/skins/xp-classic/mine-death.png",
        misflagged: "/games/mine-islands/skins/xp-classic/misflagged.png",
      },
    },
    {
      id: "deep-sea",
      name: "Blowfish",
      description: "A puffed blowfish that becomes a lurking shark.",
      preview: { sources: ["/games/mine-islands/skins/deep-sea/hazard.svg", "/games/mine-islands/skins/deep-sea/death.svg"], presentation: "pair" },
      unlock: STARTER,
      value: {
        hazard: "/games/mine-islands/skins/deep-sea/hazard.svg",
        death: "/games/mine-islands/skins/deep-sea/death.svg",
        misflagged: "/games/mine-islands/skins/deep-sea/misflagged.svg",
      },
    },
    {
      id: "cosmic",
      name: "Saucer",
      description: "A hovering saucer that becomes an incoming comet.",
      preview: { sources: ["/games/mine-islands/skins/cosmic/hazard.svg", "/games/mine-islands/skins/cosmic/death.svg"], presentation: "pair" },
      unlock: STARTER,
      value: {
        hazard: "/games/mine-islands/skins/cosmic/hazard.svg",
        death: "/games/mine-islands/skins/cosmic/death.svg",
        misflagged: "/games/mine-islands/skins/cosmic/misflagged.svg",
      },
    },
    {
      id: "naval",
      name: "Contact mine",
      description: "A spiked naval mine.",
      preview: { sources: ["/games/mine-islands/parts/mine.svg", "/games/mine-islands/parts/blast.svg"], presentation: "pair" },
      unlock: STARTER,
      value: {
        hazard: "/games/mine-islands/parts/mine.svg",
        death: "/games/mine-islands/parts/blast.svg",
        misflagged: "/games/mine-islands/parts/misflagged.svg",
      },
    },
    {
      id: "crystal",
      name: "Crystal",
      description: "An unstable geode that shatters when struck.",
      preview: { sources: ["/games/mine-islands/parts/crystal/hazard.svg", "/games/mine-islands/parts/crystal/death.svg"], presentation: "pair" },
      unlock: STARTER,
      value: {
        hazard: "/games/mine-islands/parts/crystal/hazard.svg",
        death: "/games/mine-islands/parts/crystal/death.svg",
        misflagged: "/games/mine-islands/parts/crystal/misflagged.svg",
      },
    },
  ]),
  flag: part("Flag asset", "The marker you place on a suspected mine.", [
    {
      id: "survey",
      name: "Pennant",
      description: "The original triangular flag.",
      preview: { sources: ["/games/mine-islands/skins/survey/flag.svg"], presentation: "contain" },
      unlock: STARTER,
      value: { flag: "/games/mine-islands/skins/survey/flag.svg" },
    },
    {
      id: "xp-classic",
      name: "XP Classic",
      description: "The desktop pixel flag.",
      preview: { sources: ["/games/mine-islands/skins/xp-classic/flag.png"], presentation: "contain" },
      unlock: STARTER,
      pixelated: true,
      value: { flag: "/games/mine-islands/skins/xp-classic/flag.png" },
    },
    {
      id: "deep-sea",
      name: "Anchor",
      description: "A dropped anchor.",
      preview: { sources: ["/games/mine-islands/skins/deep-sea/flag.svg"], presentation: "contain" },
      unlock: STARTER,
      value: { flag: "/games/mine-islands/skins/deep-sea/flag.svg" },
    },
    {
      id: "cosmic",
      name: "Satellite",
      description: "A parked satellite.",
      preview: { sources: ["/games/mine-islands/skins/cosmic/flag.svg"], presentation: "contain" },
      unlock: STARTER,
      value: { flag: "/games/mine-islands/skins/cosmic/flag.svg" },
    },
    {
      id: "naval",
      name: "Buoy",
      description: "A striped channel buoy.",
      preview: { sources: ["/games/mine-islands/parts/buoy.svg"], presentation: "contain" },
      unlock: STARTER,
      value: { flag: "/games/mine-islands/parts/buoy.svg" },
    },
    {
      id: "crystal",
      name: "Survey pin",
      description: "A planted survey pennant.",
      preview: { sources: ["/games/mine-islands/parts/crystal/flag.svg"], presentation: "contain" },
      unlock: STARTER,
      value: { flag: "/games/mine-islands/parts/crystal/flag.svg" },
    },
  ]),
};

const MINI_CHESS_PARTS: AssetParts<"mini-chess"> = {
  pawn: chessPart("Pawn asset", "p"),
  knight: chessPart("Knight asset", "n"),
  bishop: chessPart("Bishop asset", "b"),
  rook: chessPart("Rook asset", "r"),
  queen: chessPart("Queen asset", "q"),
  king: chessPart("King asset", "k"),
};

export const GAME_ASSET_PARTS: { [G in GameId]: AssetParts<G> } = {
  queens: QUEENS_PARTS,
  tango: TANGO_PARTS,
  lights: LIGHTS_PARTS,
  tracks: TRACKS_PARTS,
  zip: ZIP_PARTS,
  "mine-islands": MINE_ISLANDS_PARTS,
  "mini-chess": MINI_CHESS_PARTS,
};

/**
 * Order matters: it is the order the pickers appear in the config screen.
 * Palette and tint are rendered first and are not listed here.
 */
export const GAME_PART_ORDER: { [G in GameId]: readonly (keyof GamePartValues[G] & string)[] } = {
  queens: ["marker"],
  tango: ["sun", "moon"],
  lights: ["bulb"],
  tracks: ["pipe", "liquid"],
  zip: ["background"],
  "mine-islands": ["mine", "flag"],
  "mini-chess": ["pawn", "knight", "bishop", "rook", "queen", "king"],
};

/* --------------------------------------------------------------- resolvers -- */

type Resolvers = {
  [G in GameId]: (values: GamePartValues[G]) => GameSkinAssetMap[G];
};

export const PART_RESOLVERS: Resolvers = {
  queens: (values) => ({ marker: values.marker.marker }),
  // Index 0 is the low symbol and index 1 the high one; Tango reads them
  // positionally, so the moon must stay first even though the sun is picked
  // first in the UI.
  tango: (values) => ({ symbols: [values.moon.symbol, values.sun.symbol] }),
  lights: (values) => ({ bulbs: values.bulb.bulbs }),
  tracks: (values) => ({
    node: values.pipe.node,
    pipeStyle: values.pipe.pipeStyle,
    flowParticle: values.liquid.flowParticle,
  }),
  zip: (values) => ({ revealImage: values.background.revealImage }),
  // `clueTiles` and `hud` are not here: they belong to the board, and
  // `resolveGameSkin` merges them in afterwards.
  "mine-islands": (values) => ({
    hazard: values.mine.hazard,
    death: values.mine.death,
    misflagged: values.mine.misflagged,
    flag: values.flag.flag,
  }),
  "mini-chess": (values) => ({
    pieces: {
      p: values.pawn,
      n: values.knight,
      b: values.bishop,
      r: values.rook,
      q: values.queen,
      k: values.king,
    },
  }),
};

export function partDefinition(
  gameId: GameId,
  partId: string,
): AssetPart<unknown> | undefined {
  const parts = GAME_ASSET_PARTS[gameId] as Record<string, AssetPart<unknown>>;
  return parts[partId];
}

export function partOption(
  gameId: GameId,
  partId: string,
  optionId: string,
): PartOption<unknown> | undefined {
  return partDefinition(gameId, partId)?.options.find((option) => option.id === optionId);
}
