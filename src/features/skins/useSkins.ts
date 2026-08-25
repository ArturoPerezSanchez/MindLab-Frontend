import { useContext, useMemo } from "react";
import type { GameId } from "@/shared/gameOptions";
import { SkinContext, type SkinContextValue } from "./SkinContext";
import { resolveGameSkin, type ResolvedGameSkin } from "./skins";

export function useSkins(): SkinContextValue {
  const value = useContext(SkinContext);
  if (!value) {
    throw new Error("useSkins must be used inside SkinProvider.");
  }
  return value;
}

/**
 * Renderers keep consuming stable roles. They never learn that a role now comes
 * from an independently chosen part rather than from a whole skin.
 */
export function useGameSkin<G extends GameId>(gameId: G): ResolvedGameSkin<G> {
  const { selectedSkins } = useSkins();
  const customization = selectedSkins[gameId];
  return useMemo(() => resolveGameSkin(gameId, customization), [customization, gameId]);
}
