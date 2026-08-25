import type { GameId } from "@/shared/gameOptions";
import type { BoardHudStyle, FlowParticle, GameSkinAssetMap, MineHud, ResolvedGameSkin } from "./skins";

/**
 * A static miniature of the board drawn from the same CSS tokens and asset roles
 * the real renderers consume. It is deliberately not the game renderer: it needs
 * no puzzle, no PixiJS, and no state.
 *
 * The status bar mirrors `drawSuiteHud` and `drawXpHud` in `CanvasBoard`: three
 * metric columns (Timer, Best, and a per-game third) with dividers and an accent
 * rule, or the bevelled grey panel with digit boxes and a face for XP Classic.
 * Keep the two in step — the bar is part of the board, and a board that replaces
 * it must look the same here as in play.
 */
const SIZE = 4;
const CELLS = Array.from({ length: SIZE * SIZE }, (_, index) => index);

type Metric = { label: string; value: string };

/* -------------------------------------------------------------- status bar -- */

function XpDigits({ hud, value }: { hud: MineHud; value: string }) {
  return (
    <span className="board-preview-xp-box">
      {value.split("").map((character, index) => (
        <img
          key={index}
          src={character === "-" ? hud.minus : hud.digits[Number(character)]}
          alt=""
          loading="lazy"
        />
      ))}
    </span>
  );
}

function StatusBar({
  hud,
  metrics,
  style,
}: {
  hud?: MineHud;
  metrics: readonly Metric[];
  /** A themed board's own bar, mirroring what `drawSuiteHud` paints in play. */
  style?: BoardHudStyle;
}) {
  if (!hud && style) {
    return (
      <div
        className="board-preview-hud board-preview-hud-themed"
        aria-hidden="true"
        style={{
          background: style.panelShade
            ? `linear-gradient(${style.panel} 55%, ${style.panelShade} 55%)`
            : style.panel,
          backgroundImage: style.texture
            ? `${style.panelShade ? `linear-gradient(${style.panel} 55%, ${style.panelShade} 55%), ` : ""}url("${style.texture}")`
            : undefined,
          backgroundSize: style.texture ? "auto, 34px 100%" : undefined,
          borderBottom: `3px solid ${style.rule}`,
          imageRendering: style.pixelated ? "pixelated" : undefined,
        }}
      >
        {metrics.map((metric) => (
          <div className="board-preview-metric" key={metric.label}>
            <span style={{ color: style.label, fontFamily: style.valueFont }}>{metric.label}</span>
            <strong style={{ color: style.value, fontFamily: style.valueFont }}>{metric.value}</strong>
          </div>
        ))}
      </div>
    );
  }

  if (hud) {
    return (
      <div className="board-preview-hud board-preview-hud-xp" aria-hidden="true">
        {metrics.map((metric, index) => (
          <div className="board-preview-metric" key={metric.label}>
            <span>{metric.label}</span>
            <span className="board-preview-xp-slot">
              {index === 1 ? (
                <img className="board-preview-xp-face" src={hud.faces.neutral} alt="" />
              ) : null}
              <XpDigits hud={hud} value={metric.value} />
            </span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="board-preview-hud" aria-hidden="true">
      {metrics.map((metric) => (
        <div className="board-preview-metric" key={metric.label}>
          <span>{metric.label}</span>
          <strong>{metric.value}</strong>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------- board -- */

function Grid({
  children,
  cellStyle,
  overlay,
}: {
  children?: React.ReactNode;
  cellStyle: (index: number) => React.CSSProperties;
  overlay?: React.ReactNode;
}) {
  return (
    <div className="board-preview-grid">
      {CELLS.map((index) => (
        <span key={index} className="board-preview-cell" style={cellStyle(index)} />
      ))}
      {overlay}
      {children}
    </div>
  );
}

function placement(index: number, scale: number): React.CSSProperties {
  const row = Math.floor(index / SIZE);
  const col = index % SIZE;
  const inset = (1 - scale) / 2;
  return {
    left: `${((col + inset) / SIZE) * 100}%`,
    top: `${((row + inset) / SIZE) * 100}%`,
    width: `${(scale / SIZE) * 100}%`,
    height: `${(scale / SIZE) * 100}%`,
  };
}

function Piece({ index, src, scale = 0.66 }: { index: number; src: string; scale?: number }) {
  return (
    <img
      className="board-preview-piece"
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      style={placement(index, scale)}
    />
  );
}

/**
 * Recolours a sprite to the chosen tint without a second copy of the artwork:
 * the image supplies the shading and a `color`-blended layer masked to the same
 * alpha supplies the hue.
 */
function TintedPiece({ index, src, scale = 0.66 }: { index: number; src: string; scale?: number }) {
  const mask = `url("${src}") center / contain no-repeat`;
  return (
    <span className="board-preview-tinted" style={placement(index, scale)}>
      <img src={src} alt="" loading="lazy" decoding="async" />
      <span className="board-preview-tint" style={{ mask, WebkitMask: mask }} />
    </span>
  );
}

/** Classic Minesweeper clue colours, used when a board brings no clue tiles. */
const CLUE_COLORS = ["#1b39c4", "#1d7a2e", "#c22a2a", "#141a72", "#7a1d1d", "#177a7a", "#1a1a1a", "#5f5f5f"];

function Clue({ index, count }: { index: number; count: number }) {
  return (
    <span
      className="board-preview-clue"
      style={{ ...placement(index, 1), color: CLUE_COLORS[count - 1] }}
    >
      {count}
    </span>
  );
}

const ROUTE = "M0.5 0.5 H2.5 V1.5 H1.5 V2.5 H3.5";
const TRACK = "M0.5 1.5 H1.5 V0.5 M1.5 1.5 H2.5 V2.5 H3.5";

function RouteOverlay({ revealImage }: { revealImage?: string }) {
  return (
    <svg className="board-preview-overlay" viewBox="0 0 4 4" aria-hidden="true">
      {revealImage ? (
        <>
          <mask id="board-preview-route-mask">
            <path d={ROUTE} fill="none" stroke="#fff" strokeWidth="0.52" strokeLinecap="round" strokeLinejoin="round" />
          </mask>
          <path d={ROUTE} fill="none" stroke="var(--route-soft)" strokeWidth="0.6" strokeLinecap="round" strokeLinejoin="round" />
          <image href={revealImage} x="0" y="0" width="4" height="4" preserveAspectRatio="xMidYMid slice" mask="url(#board-preview-route-mask)" />
        </>
      ) : (
        <path d={ROUTE} fill="none" stroke="var(--route)" strokeWidth="0.34" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}

/**
 * Each material reads differently, the same way it does in the real scene:
 * coolant is small bubbles in a light fluid, energy is a thin bright discharge,
 * and oil is a heavy dark slug carrying a sheen. The dash offset animates rather
 * than running the real particle system.
 */
const FLOW_STYLES = {
  liquid: { width: 0.14, dash: "0.07 0.19", stroke: "var(--flow-bright, var(--flow))", cap: "round", opacity: 0.85 },
  energy: { width: 0.09, dash: "0.34 0.42", stroke: "var(--flow-bright, var(--flow))", cap: "round", opacity: 1 },
  oil: { width: 0.2, dash: "0.42 0.26", stroke: "var(--flow, #3a2f22)", cap: "butt", opacity: 0.96 },
} as const;

function TrackOverlay({
  cylindrical,
  flow,
}: {
  cylindrical: boolean;
  flow?: FlowParticle;
}) {
  const material = flow?.material ?? "liquid";
  const style = FLOW_STYLES[material];
  const duration = flow ? Math.max(0.5, 1.6 / Math.max(0.2, flow.speed)) : 1.4;

  return (
    <svg className="board-preview-overlay" viewBox="0 0 4 4" aria-hidden="true">
      <path d={TRACK} fill="none" stroke="var(--track)" strokeWidth="0.4" strokeLinecap="round" strokeLinejoin="round" />
      {cylindrical ? (
        <path
          d={TRACK}
          fill="none"
          stroke="var(--track-sheen, var(--track-channel))"
          strokeWidth="0.09"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.55"
          transform="translate(-0.035 -0.055)"
        />
      ) : null}
      <path d={TRACK} fill="none" stroke="var(--track-channel)" strokeWidth="0.24" strokeLinecap="round" strokeLinejoin="round" />
      {flow ? (
        <>
          <path
            className="board-preview-flow"
            d={TRACK}
            fill="none"
            stroke={style.stroke}
            strokeWidth={style.width}
            strokeLinecap={style.cap}
            strokeDasharray={style.dash}
            opacity={style.opacity}
            style={{ animationDuration: `${duration}s` }}
          />
          {material === "oil" ? (
            <path
              className="board-preview-flow"
              d={TRACK}
              fill="none"
              stroke="var(--flow-bright)"
              strokeWidth="0.05"
              strokeDasharray="0.2 0.48"
              opacity="0.85"
              style={{ animationDuration: `${duration}s` }}
              transform="translate(-0.02 -0.035)"
            />
          ) : null}
          {material === "energy" ? (
            <path
              className="board-preview-flow"
              d={TRACK}
              fill="none"
              stroke="var(--flow-glow, var(--flow))"
              strokeWidth="0.24"
              strokeLinecap="round"
              strokeDasharray={style.dash}
              opacity="0.5"
              style={{ animationDuration: `${duration}s` }}
            />
          ) : null}
        </>
      ) : null}
    </svg>
  );
}

/*
 * A real 4x4 Queens board: four regions, one queen per row, column, and region,
 * and no two queens touching even diagonally. An invalid arrangement here would
 * teach the wrong thing about the game.
 */
const QUEENS_REGIONS = [1, 1, 2, 2, 1, 2, 2, 2, 3, 3, 3, 4, 3, 4, 4, 4];
const QUEENS_MARKERS = [1, 7, 8, 14];

const LIT = new Set([1, 4, 6, 11, 14]);
const GIVEN = new Set([0, 5, 10, 15]);
/** Revealed cells and the clue each one shows. */
const CLUES: ReadonlyArray<[number, number]> = [
  [0, 1],
  [1, 2],
  [4, 1],
  [5, 3],
  [8, 2],
  [12, 1],
];
const REVEALED = new Set([...CLUES.map(([index]) => index), 9, 11, 14]);

function checker(index: number): boolean {
  return (Math.floor(index / SIZE) + (index % SIZE)) % 2 === 1;
}

export function BoardPreview({ skin, label }: { skin: ResolvedGameSkin; label: string }) {
  const gameId: GameId = skin.gameId;
  let body: React.ReactNode;
  let third: Metric = { label: "Filled", value: "0" };
  let hud: MineHud | undefined;
  let hudStyle: BoardHudStyle | undefined;

  switch (gameId) {
    case "queens": {
      const assets = skin.assets as GameSkinAssetMap["queens"];
      third = { label: "Queens", value: "4/4" };
      hudStyle = skin.assets.surface?.hud;
      body = (
        <Grid
          cellStyle={(index) => ({
            // Material over colour, as the real board layers it, so the picker
            // shows the board you are actually choosing.
            backgroundColor: `var(--region-${QUEENS_REGIONS[index]})`,
            backgroundImage: skin.assets.surface ? `url("${skin.assets.surface.cellTexture}")` : undefined,
            backgroundSize: "100% 100%",
            borderColor: skin.assets.surface?.edgeColor,
          })}
        >
          {QUEENS_MARKERS.map((index) => (
            <Piece key={index} index={index} src={assets.marker} />
          ))}
        </Grid>
      );
      break;
    }
    case "tango": {
      const [low, high] = (skin.assets as GameSkinAssetMap["tango"]).symbols;
      third = { label: "Filled", value: "6/16" };
      body = (
        <Grid cellStyle={(index) => ({ background: GIVEN.has(index) ? "var(--board-given)" : "var(--board-cell)" })}>
          <Piece index={0} src={high.src} scale={0.6} />
          <Piece index={5} src={low.src} scale={0.6} />
          <Piece index={6} src={high.src} scale={0.6} />
          <Piece index={9} src={low.src} scale={0.6} />
          <Piece index={10} src={high.src} scale={0.6} />
          <Piece index={15} src={low.src} scale={0.6} />
        </Grid>
      );
      break;
    }
    case "lights": {
      const [off, on] = (skin.assets as GameSkinAssetMap["lights"]).bulbs;
      third = { label: "Lit", value: "5/16" };
      body = (
        <Grid
          cellStyle={(index) => ({
            background: checker(index) ? "var(--cell-alt)" : "var(--cell)",
            boxShadow: LIT.has(index) ? "inset 0 0 14px color-mix(in srgb, var(--glow) 62%, transparent)" : undefined,
          })}
        >
          {CELLS.map((index) =>
            LIT.has(index) ? (
              <TintedPiece key={index} index={index} src={on} scale={0.58} />
            ) : (
              <Piece key={index} index={index} src={off} scale={0.58} />
            ),
          )}
        </Grid>
      );
      break;
    }
    case "tracks": {
      const assets = skin.assets as GameSkinAssetMap["tracks"];
      third = { label: "Flow", value: "7/7" };
      body = (
        <Grid
          cellStyle={(index) => ({ background: index === 3 || index === 12 ? "var(--empty-cell)" : "var(--cell)" })}
          overlay={<TrackOverlay cylindrical={assets.pipeStyle === "cylindrical"} flow={assets.flowParticle} />}
        >
          <Piece index={5} src={assets.node} scale={0.44} />
          <Piece index={10} src={assets.node} scale={0.44} />
        </Grid>
      );
      break;
    }
    case "zip": {
      const assets = skin.assets as GameSkinAssetMap["zip"];
      third = { label: "Path", value: "6/16" };
      body = (
        <Grid
          cellStyle={(index) => ({ background: checker(index) ? "var(--cell-alt)" : "var(--cell)" })}
          overlay={<RouteOverlay revealImage={assets.revealImage} />}
        />
      );
      break;
    }
    case "mine-islands": {
      const assets = skin.assets as GameSkinAssetMap["mine-islands"];
      hud = assets.hud;
      third = { label: "Marked", value: "2/4" };
      body = (
        <Grid
          cellStyle={(index) => ({
            background: REVEALED.has(index) ? "var(--revealed)" : "var(--covered)",
            boxShadow: REVEALED.has(index)
              ? undefined
              : "inset 1px 1px 0 rgba(255,255,255,0.25), inset -1px -1px 0 rgba(0,0,0,0.14)",
          })}
        >
          {CLUES.map(([index, count]) =>
            assets.clueTiles ? (
              <Piece key={index} index={index} src={assets.clueTiles[count - 1]} scale={1} />
            ) : (
              <Clue key={index} index={index} count={count} />
            ),
          )}
          <Piece index={7} src={assets.flag} scale={0.62} />
          <Piece index={10} src={assets.hazard} scale={0.62} />
          <Piece index={11} src={assets.death ?? assets.hazard} scale={0.62} />
          <Piece index={14} src={assets.misflagged ?? assets.hazard} scale={0.62} />
        </Grid>
      );
      break;
    }
    case "mini-chess": {
      const { pieces } = skin.assets as GameSkinAssetMap["mini-chess"];
      const url = (color: "w" | "b", type: "p" | "n" | "b" | "r" | "q" | "k") =>
        `${pieces[type].root}/${color}${type}.${pieces[type].extension}`;
      third = { label: "Line", value: "1/2" };
      body = (
        <Grid cellStyle={(index) => ({ background: checker(index) ? "var(--board-dark)" : "var(--board-light)" })}>
          <Piece index={0} src={url("b", "r")} scale={0.78} />
          <Piece index={1} src={url("b", "q")} scale={0.78} />
          <Piece index={3} src={url("b", "k")} scale={0.78} />
          <Piece index={6} src={url("b", "p")} scale={0.78} />
          <Piece index={9} src={url("w", "n")} scale={0.78} />
          <Piece index={12} src={url("w", "b")} scale={0.78} />
          <Piece index={14} src={url("w", "k")} scale={0.78} />
          <Piece index={15} src={url("w", "r")} scale={0.78} />
        </Grid>
      );
      break;
    }
  }

  // Mirrors the live games: Timer, Best, then one game-specific metric.
  const metrics: Metric[] = hud
    ? [
        { label: "Timer", value: "042" },
        { label: "Best", value: "031" },
        { label: "Marked", value: "002" },
      ]
    : [{ label: "Timer", value: "0:42" }, { label: "Best", value: "0:31" }, third];

  return (
    <div className="board-preview" role="img" aria-label={`Preview of the ${label} board`}>
      <StatusBar hud={hud} metrics={metrics} style={hudStyle} />
      {body}
    </div>
  );
}
