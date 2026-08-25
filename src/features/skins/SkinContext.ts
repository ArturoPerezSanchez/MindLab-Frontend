import { createContext } from "react";
import type { GameId } from "@/shared/gameOptions";
import type { GameSkinSelections } from "./skins";

export type SkinContextValue = {
  selectedSkins: GameSkinSelections;
  /** Change one slot, leaving every other slot untouched. */
  selectPart: (gameId: GameId, partId: string, optionId: string) => void;
  /** Put every slot of one game back to its default option. */
  resetGame: (gameId: GameId) => void;
  isPartUnlocked: (gameId: GameId, partId: string, optionId: string) => boolean;
};

export const SkinContext = createContext<SkinContextValue | null>(null);
