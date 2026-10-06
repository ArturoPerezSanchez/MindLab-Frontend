import {
  Bomb,
  Crown,
  Lightbulb,
  Route,
  Spline,
  SunMoon,
  type LucideIcon,
} from "lucide-react";
import { ChessKnightIcon } from "./ChessKnightIcon";
import type { GameId } from "@/shared/gameOptions";

export const GAME_ICONS: Record<GameId, LucideIcon> = {
  thrones: Crown,
  eclipse: SunMoon,
  lights: Lightbulb,
  tracks: Spline,
  dash: Route,
  "mine-islands": Bomb,
  "mini-chess": ChessKnightIcon,
};
