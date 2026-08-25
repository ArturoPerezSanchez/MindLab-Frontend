import type { ChessPieceSource } from "@/features/skins/skins";
import type { BoardPiece, PieceSymbol } from "./types";

/**
 * A source per piece type rather than a single set root, which is what lets a
 * player keep a Club rook next to a Fantasy knight.
 */
export type ChessPieceSources = Readonly<Record<PieceSymbol, ChessPieceSource>>;

export function pieceUrl(sources: ChessPieceSources, piece: BoardPiece): string {
  const source = sources[piece.type];
  return `${source.root}/${piece.color}${piece.type}.${source.extension}`;
}

export function pieceSymbolUrl(
  sources: ChessPieceSources,
  color: "w" | "b",
  type: PieceSymbol,
): string {
  const source = sources[type];
  return `${source.root}/${color}${type}.${source.extension}`;
}
