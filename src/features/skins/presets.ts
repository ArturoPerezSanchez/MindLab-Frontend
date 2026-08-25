import type { GameId } from "@/shared/gameOptions";
import type { PartSelections, SkinUnlock } from "./types";

/**
 * A preset is a named set of part selections. Players never see these: the
 * config screen exposes the parts directly. Presets survive for two reasons —
 * the first entry per game supplies the defaults, and preset ids deliberately
 * match the pre-part skin ids, which makes migrating stored
 * `mindlab-game-skins-v1` values a straight lookup.
 */
export type SkinPreset = {
  id: string;
  name: string;
  description: string;
  unlock: SkinUnlock;
  selections: PartSelections;
};

const STARTER = { type: "starter" } as const;

export const GAME_PRESETS = {
  queens: [
    {
      id: "studio",
      name: "Royal",
      description: "The original crown marker on the studio regions.",
      unlock: STARTER,
      selections: { palette: "studio", marker: "royal" },
    },
    {
      id: "garden",
      name: "Rose garden",
      description: "Open blooms over softened botanical regions.",
      unlock: STARTER,
      selections: { palette: "garden", marker: "rose" },
    },
    // The detailed boards, each paired with the marker cut for it. They are
    // presets rather than a new concept: board and marker are still separate
    // parts, this is just the combination they were drawn as.
    {
      id: "quarry",
      name: "Carved stone",
      description: "Chiselled tiles and a wrought iron queen.",
      unlock: STARTER,
      selections: { palette: "quarry", marker: "iron" },
    },
    {
      id: "regalia",
      name: "Royal marble",
      description: "Veined marble, gold inlay, and a jewelled coronet.",
      unlock: STARTER,
      selections: { palette: "regalia", marker: "coronet" },
    },
    {
      id: "timber",
      name: "Chess club",
      description: "Oiled hardwood, brass edging, and a turned walnut queen.",
      unlock: STARTER,
      selections: { palette: "timber", marker: "staunton" },
    },
    {
      id: "arcade",
      name: "Arcade",
      description: "Bevelled pixel tiles and a 16-bit crown.",
      unlock: STARTER,
      selections: { palette: "arcade", marker: "pixel-crown" },
    },
    {
      id: "twilight",
      name: "Twilight",
      description: "Faceted gems on a cool evening board.",
      unlock: STARTER,
      selections: { palette: "dusk", marker: "gem" },
    },
    {
      id: "carnival",
      name: "Carnival",
      description: "Flat stars over warm high-energy regions.",
      unlock: STARTER,
      selections: { palette: "citrus", marker: "star" },
    },
  ],
  tango: [
    {
      id: "classic",
      name: "Classic",
      description: "The original stroked sun and moon.",
      unlock: STARTER,
      selections: { palette: "classic", sun: "classic", moon: "classic" },
    },
    {
      id: "emoji",
      name: "Emoji orbit",
      description: "The detailed filled sun and crescent.",
      unlock: STARTER,
      selections: { palette: "classic", sun: "emoji", moon: "emoji" },
    },
    {
      id: "elements",
      name: "Elements",
      description: "Balance water against fire.",
      unlock: STARTER,
      selections: { palette: "elements", sun: "fire", moon: "water" },
    },
    {
      id: "orchard",
      name: "Orchard",
      description: "A leaf against a droplet on soft greens.",
      unlock: STARTER,
      selections: { palette: "orchard", sun: "leaf", moon: "droplet" },
    },
    {
      id: "observatory",
      name: "Observatory",
      description: "A rayed sun and a full moon on neutral slate.",
      unlock: STARTER,
      selections: { palette: "slate", sun: "rays", moon: "craters" },
    },
  ],
  lights: [
    {
      id: "warm-glow",
      name: "Warm glow",
      description: "The original amber orbs.",
      unlock: STARTER,
      selections: { palette: "studio", tint: "amber", bulb: "orb" },
    },
    {
      id: "workshop",
      name: "Workshop",
      description: "Filament bulbs over a warm timber panel.",
      unlock: STARTER,
      selections: { palette: "walnut", tint: "amber", bulb: "bulb" },
    },
    {
      id: "harbour",
      name: "Harbour",
      description: "Cold lanterns in a deep blue room.",
      unlock: STARTER,
      selections: { palette: "midnight", tint: "arctic", bulb: "lantern" },
    },
    {
      id: "greenhouse",
      name: "Greenhouse",
      description: "Mint filament bulbs on a neutral board.",
      unlock: STARTER,
      selections: { palette: "studio", tint: "mint", bulb: "bulb" },
    },
  ],
  tracks: [
    {
      id: "transit",
      name: "Transit",
      description: "The original technical track set with no flow.",
      unlock: STARTER,
      selections: { palette: "transit", pipe: "transit", liquid: "none" },
    },
    {
      id: "liquid",
      name: "Liquid",
      description: "Coolant and bubbles through pale plastic pipe.",
      unlock: STARTER,
      selections: { palette: "coolant", pipe: "coolant", liquid: "coolant" },
    },
    {
      id: "electric",
      name: "Electric",
      description: "Live discharges through amber conduit.",
      unlock: STARTER,
      selections: { palette: "grid", pipe: "electric", liquid: "energy" },
    },
    {
      id: "crude",
      name: "Crude",
      description: "Heavy oil creeping through machined steel.",
      unlock: STARTER,
      selections: { palette: "refinery", pipe: "steel", liquid: "oil" },
    },
    {
      id: "steamworks",
      name: "Steamworks",
      description: "Riveted brass flanges carrying a light coolant.",
      unlock: STARTER,
      selections: { palette: "refinery", pipe: "brass", liquid: "coolant" },
    },
  ],
  zip: [
    {
      id: "current",
      name: "Current",
      description: "The original blue route on plain cells.",
      unlock: STARTER,
      selections: { palette: "current", tint: "cerulean", background: "none" },
    },
    {
      id: "spain",
      name: "Spanish flag",
      description: "A national flag revealed inside the route.",
      unlock: STARTER,
      selections: { palette: "parchment", tint: "ember", background: "spain" },
    },
    {
      id: "aurora",
      name: "Aurora",
      description: "A night sky revealed by a violet route.",
      unlock: STARTER,
      selections: { palette: "graphite", tint: "violet", background: "aurora" },
    },
    {
      id: "circuit",
      name: "Circuit",
      description: "Etched traces revealed by a green route.",
      unlock: STARTER,
      selections: { palette: "meadow", tint: "moss", background: "circuit" },
    },
    {
      id: "sunrise",
      name: "Sunrise",
      description: "A ridge line under a low sun.",
      unlock: STARTER,
      selections: { palette: "parchment", tint: "ember", background: "sunrise" },
    },
  ],
  "mine-islands": [
    {
      id: "survey",
      name: "Survey",
      description: "The original minefield with a hard detonation.",
      unlock: STARTER,
      selections: { palette: "survey", mine: "survey", flag: "survey" },
    },
    {
      id: "xp-classic",
      name: "XP Classic",
      description: "Classic desktop tiles, counters, and status faces.",
      unlock: STARTER,
      selections: { palette: "xp-classic", mine: "xp-classic", flag: "xp-classic" },
    },
    {
      id: "deep-sea",
      name: "Deep sea",
      description: "Blowfish, anchors, and lurking sharks.",
      unlock: STARTER,
      selections: { palette: "deep-sea", mine: "deep-sea", flag: "deep-sea" },
    },
    {
      id: "cosmic",
      name: "Cosmic",
      description: "Saucers, satellites, and incoming comets.",
      unlock: STARTER,
      selections: { palette: "cosmic", mine: "cosmic", flag: "cosmic" },
    },
    {
      id: "naval",
      name: "Naval",
      description: "Contact mines and channel buoys in shallow water.",
      unlock: STARTER,
      selections: { palette: "deep-sea", mine: "naval", flag: "naval" },
    },
  ],
  "mini-chess": [
    {
      id: "club",
      name: "Club",
      description: "The original tournament set.",
      unlock: STARTER,
      selections: chessPreset("club", "club"),
    },
    {
      id: "celtic",
      name: "Celtic",
      description: "Ornate dimensional pieces on timber.",
      unlock: STARTER,
      selections: chessPreset("celtic", "walnut"),
    },
    {
      id: "chessnut",
      name: "Chessnut",
      description: "Contemporary pieces on cool stone.",
      unlock: STARTER,
      selections: chessPreset("chessnut", "marble"),
    },
    {
      id: "fantasy",
      name: "Fantasy",
      description: "Expressive medieval pieces on timber.",
      unlock: STARTER,
      selections: chessPreset("fantasy", "walnut"),
    },
    {
      id: "firi",
      name: "Firi",
      description: "Bold compact pieces on the club board.",
      unlock: STARTER,
      selections: chessPreset("firi", "club"),
    },
    {
      id: "kiwen-suwi",
      name: "Kiwen Suwi",
      description: "Minimal geometric pieces on indigo.",
      unlock: STARTER,
      selections: chessPreset("kiwen-suwi", "midnight"),
    },
    {
      id: "rhosgfx",
      name: "RhosGFX",
      description: "Friendly outlined pieces on cool stone.",
      unlock: STARTER,
      selections: chessPreset("rhosgfx", "marble"),
    },
    {
      id: "spatial",
      name: "Spatial",
      description: "Sculptural pieces on indigo.",
      unlock: STARTER,
      selections: chessPreset("spatial", "midnight"),
    },
  ],
} as const satisfies { [G in GameId]: readonly SkinPreset[] };

function chessPreset(set: string, palette: string): PartSelections {
  return {
    palette,
    pawn: set,
    knight: set,
    bishop: set,
    rook: set,
    queen: set,
    king: set,
  };
}

export function findPreset(gameId: GameId, presetId: string): SkinPreset | undefined {
  return (GAME_PRESETS as Record<GameId, readonly SkinPreset[]>)[gameId].find(
    (preset) => preset.id === presetId,
  );
}

export function defaultPreset(gameId: GameId): SkinPreset {
  return (GAME_PRESETS as Record<GameId, readonly SkinPreset[]>)[gameId][0];
}
