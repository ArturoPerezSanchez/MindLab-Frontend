import type { SkinUnlock } from "@/features/skins/skins";

/**
 * Profile cosmetics: the placeholder avatars, the portrait frame drawn around
 * whatever avatar a player has, and the backdrop behind their profile view.
 *
 * These deliberately reuse `SkinUnlock` from the skin system so that gating a
 * portrait behind an achievement works exactly like gating a board, and a single
 * `unlockedAchievementIds` set drives both. Adding a cosmetic is a data change.
 */
export type CosmeticUnlock = SkinUnlock;

type Cosmetic = {
  id: string;
  name: string;
  /** Omitted means `starter`. */
  unlock?: CosmeticUnlock;
};

export type PlaceholderAvatar = Cosmetic & {
  src: string;
  /** Only used to group the picker; players may choose any of them. */
  presenting: "woman" | "man";
};

export type Portrait = Cosmetic & {
  /** Ring artwork drawn over the avatar. Transparent in the middle. */
  src: string;
  description: string;
};

export type ProfileBackground = Cosmetic &
  (
    | { kind: "color"; description: string; light: string; dark: string }
    | { kind: "image"; description: string; src: string; overlay: string }
  );

const AVATAR_ROOT = "/profile/avatars";
const PORTRAIT_ROOT = "/profile/portraits";

/** Four presenting-woman and four presenting-man placeholders, in picker order. */
export const PLACEHOLDER_AVATARS: readonly PlaceholderAvatar[] = [
  { id: "woman-1", name: "Avatar 1", presenting: "woman", src: `${AVATAR_ROOT}/woman-1.svg` },
  { id: "woman-2", name: "Avatar 2", presenting: "woman", src: `${AVATAR_ROOT}/woman-2.svg` },
  { id: "woman-3", name: "Avatar 3", presenting: "woman", src: `${AVATAR_ROOT}/woman-3.svg` },
  { id: "woman-4", name: "Avatar 4", presenting: "woman", src: `${AVATAR_ROOT}/woman-4.svg` },
  { id: "man-1", name: "Avatar 5", presenting: "man", src: `${AVATAR_ROOT}/man-1.svg` },
  { id: "man-2", name: "Avatar 6", presenting: "man", src: `${AVATAR_ROOT}/man-2.svg` },
  { id: "man-3", name: "Avatar 7", presenting: "man", src: `${AVATAR_ROOT}/man-3.svg` },
  { id: "man-4", name: "Avatar 8", presenting: "man", src: `${AVATAR_ROOT}/man-4.svg` },
];

/**
 * `none` is a real entry rather than a null case, so the picker, the storage
 * shape, and the unlock check all treat "no frame" like any other choice.
 */
export const PORTRAITS: readonly Portrait[] = [
  { id: "none", name: "No frame", description: "Just the avatar.", src: "" },
  {
    id: "bronze",
    name: "Bronze",
    description: "A plain metal ring.",
    src: `${PORTRAIT_ROOT}/bronze.svg`,
  },
  {
    id: "laurel",
    name: "Laurel",
    description: "Leaves at the cardinal points.",
    src: `${PORTRAIT_ROOT}/laurel.svg`,
  },
  {
    id: "circuit",
    name: "Circuit",
    description: "A dashed trace with gold pads.",
    src: `${PORTRAIT_ROOT}/circuit.svg`,
  },
  {
    id: "aurora",
    name: "Aurora",
    description: "A shifting band of light.",
    src: `${PORTRAIT_ROOT}/aurora.svg`,
  },
];

/**
 * Colours ship now; `kind: "image"` exists so an achievement can add a backdrop
 * image later without touching the component that renders it.
 */
export const PROFILE_BACKGROUNDS: readonly ProfileBackground[] = [
  { id: "slate", name: "Slate", kind: "color", description: "The default surface.", light: "#eceef0", dark: "#2f3338" },
  { id: "royal", name: "Royal", kind: "color", description: "Deep violet.", light: "#ece8fb", dark: "#302d3e" },
  { id: "moss", name: "Moss", kind: "color", description: "Soft green.", light: "#e9f3ea", dark: "#2a352c" },
  { id: "ember", name: "Ember", kind: "color", description: "Warm terracotta.", light: "#f3e8df", dark: "#3c302b" },
  { id: "ocean", name: "Ocean", kind: "color", description: "Cool blue.", light: "#e8f1f7", dark: "#29363e" },
  { id: "sand", name: "Sand", kind: "color", description: "Warm neutral.", light: "#f2ead8", dark: "#34302a" },
];

export const DEFAULT_AVATAR_ID = PLACEHOLDER_AVATARS[0].id;
export const DEFAULT_PORTRAIT_ID = PORTRAITS[0].id;
export const DEFAULT_BACKGROUND_ID = PROFILE_BACKGROUNDS[0].id;

export function findAvatar(id: string | null | undefined): PlaceholderAvatar | undefined {
  return PLACEHOLDER_AVATARS.find((avatar) => avatar.id === id);
}

export function findPortrait(id: string | null | undefined): Portrait {
  return PORTRAITS.find((portrait) => portrait.id === id) ?? PORTRAITS[0];
}

export function findBackground(id: string | null | undefined): ProfileBackground {
  return PROFILE_BACKGROUNDS.find((background) => background.id === id) ?? PROFILE_BACKGROUNDS[0];
}

export function isCosmeticUnlocked(
  cosmetic: { unlock?: CosmeticUnlock },
  unlockedAchievementIds: ReadonlySet<string>,
): boolean {
  const unlock = cosmetic.unlock ?? { type: "starter" };
  return unlock.type === "starter" || unlockedAchievementIds.has(unlock.achievementId);
}

/**
 * What a player has chosen. `imageUrl` is the uploaded picture and wins over
 * `avatarId` when present, so switching back to a placeholder is just clearing
 * the upload.
 */
export type ProfileAppearance = {
  imageUrl: string | null;
  avatarId: string;
  portraitId: string;
  backgroundId: string;
};

export const DEFAULT_APPEARANCE: ProfileAppearance = {
  imageUrl: null,
  avatarId: DEFAULT_AVATAR_ID,
  portraitId: DEFAULT_PORTRAIT_ID,
  backgroundId: DEFAULT_BACKGROUND_ID,
};

/** The image to draw for a player, upload first and placeholder second. */
export function avatarSource(appearance: Partial<ProfileAppearance> | null | undefined): string {
  if (appearance?.imageUrl) {
    return appearance.imageUrl;
  }
  return findAvatar(appearance?.avatarId)?.src ?? PLACEHOLDER_AVATARS[0].src;
}
