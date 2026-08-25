import { avatarSource, findPortrait, type ProfileAppearance } from "./cosmetics";

export type AvatarSize = "sm" | "md" | "lg" | "xl";

/**
 * The single place a player's picture is drawn. Everywhere that shows a player —
 * leaderboard rows, profile headers, multiplayer lobbies, spectator tiles — uses
 * this, so a new portrait frame appears in all of them at once.
 */
export function Avatar({
  appearance,
  name,
  size = "md",
  decorative = false,
}: {
  appearance: Partial<ProfileAppearance> | null | undefined;
  name: string;
  size?: AvatarSize;
  /** True when an adjacent label already names the player. */
  decorative?: boolean;
}) {
  const portrait = findPortrait(appearance?.portraitId);

  return (
    <span className={`avatar avatar-${size}`} data-portrait={portrait.id}>
      <img
        className="avatar-image"
        src={avatarSource(appearance)}
        alt={decorative ? "" : `${name}'s picture`}
        aria-hidden={decorative || undefined}
        loading="lazy"
        decoding="async"
      />
      {portrait.src ? (
        <img className="avatar-portrait" src={portrait.src} alt="" aria-hidden="true" loading="lazy" />
      ) : null}
    </span>
  );
}
