import { useEffect } from "react";
import { useConsent } from "@/features/privacy/ConsentProvider";

export type AdPlacement = "menu-footer" | "game-footer" | "result-interstitial";

/**
 * Stable integration boundary for web ads and a future native APK shell.
 * `none` is the safe default. `placeholder` is visual QA only. `native` emits
 * an event that Android's WebView bridge can observe without coupling games to
 * an ad SDK.
 */
export function AdSlot({ placement }: { placement: AdPlacement }) {
  const { consent } = useConsent();
  const provider = import.meta.env.VITE_AD_PROVIDER ?? "none";
  const enabled = consent?.ads === true && provider !== "none";

  useEffect(() => {
    if (enabled && provider === "native") {
      window.dispatchEvent(new CustomEvent("mindlab:ad-request", { detail: { placement } }));
    }
  }, [enabled, placement, provider]);

  if (!enabled || provider === "native") {
    return null;
  }

  if (provider === "placeholder") {
    return (
      <aside className="ad-slot" aria-label="Advertisement preview" data-placement={placement}>
        Ad placement: {placement}
      </aside>
    );
  }

  return null;
}
