import { useCallback, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Lock, RotateCcw } from "lucide-react";
import { GAME_LABELS, GAME_OPTIONS, type GameId } from "@/shared/gameOptions";
import { GAME_ICONS } from "@/shared/icons/gameIcons";
import { BoardPreview } from "./BoardPreview";
import { useSkins } from "./useSkins";
import {
  gameSlots,
  isDefaultCustomization,
  paletteToken,
  resolveGameSkin,
  type SkinSlot,
  type SkinSlotOption,
  type SlotPreview,
} from "./skins";

const GAME_IDS = GAME_OPTIONS.map((option) => option.id) as readonly GameId[];

function SlotArtwork({ preview }: { preview: SlotPreview }) {
  if (preview.kind === "swatch") {
    return (
      <span className="kart-swatch" aria-hidden="true">
        {preview.colors.map((color, index) => (
          <span key={`${color}-${index}`} style={{ background: color }} />
        ))}
      </span>
    );
  }

  return (
    <span className={`kart-art kart-art-${preview.presentation}`} aria-hidden="true">
      {preview.sources.map((source, index) => (
        <img key={`${source}-${index}`} src={source} alt="" loading="lazy" decoding="async" />
      ))}
    </span>
  );
}

/**
 * One category column: a fixed frame showing the current option with a step
 * control above and below. The frame never resizes between options, so stepping
 * through a category does not reflow the row.
 */
function SlotColumn({ gameId, slot }: { gameId: GameId; slot: SkinSlot }) {
  const { selectedSkins, selectPart, isPartUnlocked } = useSkins();
  const currentId = selectedSkins[gameId][slot.id];

  // Locked options are skipped rather than shown as dead stops, so every press
  // of an arrow always changes the board.
  const available = useMemo(
    () => slot.options.filter((option) => isPartUnlocked(gameId, slot.id, option.id)),
    [gameId, isPartUnlocked, slot.id, slot.options],
  );
  const lockedCount = slot.options.length - available.length;
  const index = Math.max(
    0,
    available.findIndex((option) => option.id === currentId),
  );
  const current: SkinSlotOption | undefined = available[index];

  const step = useCallback(
    (delta: number) => {
      if (available.length < 2) {
        return;
      }
      const next = (index + delta + available.length) % available.length;
      selectPart(gameId, slot.id, available[next].id);
    },
    [available, gameId, index, selectPart, slot.id],
  );

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
        event.preventDefault();
        step(-1);
      } else if (event.key === "ArrowDown" || event.key === "ArrowRight") {
        event.preventDefault();
        step(1);
      }
    },
    [step],
  );

  const headingId = `kart-${gameId}-${slot.id}`;
  const single = available.length < 2;

  return (
    <div className="kart-column" role="group" aria-labelledby={headingId}>
      <h3 className="kart-label" id={headingId}>
        {slot.label}
      </h3>

      <button
        className="kart-arrow"
        type="button"
        disabled={single}
        aria-label={`Previous ${slot.label.toLowerCase()}`}
        onClick={() => step(-1)}
      >
        <ChevronUp aria-hidden="true" size={18} />
      </button>

      <div className="kart-frame" tabIndex={0} onKeyDown={onKeyDown} title={current?.description}>
        {current ? <SlotArtwork preview={current.preview} /> : null}
        {lockedCount > 0 ? (
          <span className="kart-locked" title={`${lockedCount} still locked`}>
            <Lock aria-hidden="true" size={13} />
            {lockedCount}
          </span>
        ) : null}
      </div>

      <button
        className="kart-arrow"
        type="button"
        disabled={single}
        aria-label={`Next ${slot.label.toLowerCase()}`}
        onClick={() => step(1)}
      >
        <ChevronDown aria-hidden="true" size={18} />
      </button>

      <p className="kart-value" aria-live="polite">
        {current?.name ?? "None"}
      </p>
      <p className="kart-count" aria-hidden="true">
        {index + 1} / {available.length}
      </p>
    </div>
  );
}

export function AppearanceView() {
  const [gameId, setGameId] = useState<GameId>("queens");
  const { selectedSkins, resetGame } = useSkins();
  const customization = selectedSkins[gameId];
  const slots = gameSlots(gameId);
  const skin = resolveGameSkin(gameId, customization);
  const isDefault = isDefaultCustomization(gameId, customization);

  return (
    <main className="appearance-shell" aria-labelledby="appearance-title">
      <h1 className="sr-only" id="appearance-title">
        Appearance
      </h1>

      <div className="skin-game-tabs" role="tablist" aria-label="Choose game">
        {GAME_IDS.map((id) => {
          const Icon = GAME_ICONS[id];
          return (
            <button
              className="skin-game-tab"
              type="button"
              role="tab"
              aria-selected={id === gameId}
              aria-label={GAME_LABELS[id]}
              title={GAME_LABELS[id]}
              key={id}
              onClick={() => setGameId(id)}
            >
              <Icon aria-hidden="true" size={18} />
              <span>{GAME_LABELS[id]}</span>
            </button>
          );
        })}
      </div>

      {/*
        The rack stays on the neutral app surface. Only the preview below
        carries the board and tint attributes, so choosing a board recolours the
        board rather than the screen you are choosing it on.
      */}
      <div className="appearance-rack" data-pixelated={skin.pixelated ? "true" : undefined}>
        <div className="kart-rack">
          <div className="kart-track">
            {slots.map((slot) => (
              <SlotColumn key={slot.id} gameId={gameId} slot={slot} />
            ))}
          </div>
        </div>

        <button
          className="kart-reset"
          type="button"
          disabled={isDefault}
          onClick={() => resetGame(gameId)}
        >
          <RotateCcw aria-hidden="true" size={14} />
          Reset {GAME_LABELS[gameId]} to defaults
        </button>
      </div>

      <div
        className="appearance-preview"
        data-game={gameId}
        data-palette={paletteToken(gameId, skin.palette.id)}
        data-tint={skin.tint ? paletteToken(gameId, skin.tint.id) : undefined}
        data-pixelated={skin.pixelated ? "true" : undefined}
      >
        <BoardPreview skin={skin} label={GAME_LABELS[gameId]} />
      </div>
    </main>
  );
}
