import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const CONSENT_KEY = "mindlab-consent-v1";

export type OptionalConsent = {
  analytics: boolean;
  ads: boolean;
  updatedAt: string;
};

type ConsentContextValue = {
  consent: OptionalConsent | null;
  openPreferences: () => void;
};

const ConsentContext = createContext<ConsentContextValue | null>(null);

function storedConsent(): OptionalConsent | null {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(CONSENT_KEY) ?? "null") as Partial<OptionalConsent> | null;
    if (parsed && typeof parsed.analytics === "boolean" && typeof parsed.ads === "boolean") {
      return {
        analytics: parsed.analytics,
        ads: parsed.ads,
        updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date(0).toISOString(),
      };
    }
  } catch {
    // Invalid or unavailable storage is equivalent to no consent decision.
  }
  return null;
}

export function ConsentProvider({ children }: { children: ReactNode }) {
  const [consent, setConsent] = useState<OptionalConsent | null>(storedConsent);
  const [isOpen, setIsOpen] = useState(() => consent === null);
  const [analytics, setAnalytics] = useState(() => consent?.analytics ?? false);
  const [ads, setAds] = useState(() => consent?.ads ?? false);

  const save = useCallback((next: Pick<OptionalConsent, "analytics" | "ads">) => {
    const value: OptionalConsent = { ...next, updatedAt: new Date().toISOString() };
    try {
      window.localStorage.setItem(CONSENT_KEY, JSON.stringify(value));
    } catch {
      // The current visit still respects the choice even when storage is unavailable.
    }
    setAnalytics(value.analytics);
    setAds(value.ads);
    setConsent(value);
    setIsOpen(false);
  }, []);

  const openPreferences = useCallback(() => {
    setAnalytics(consent?.analytics ?? false);
    setAds(consent?.ads ?? false);
    setIsOpen(true);
  }, [consent]);

  const value = useMemo(() => ({ consent, openPreferences }), [consent, openPreferences]);

  return (
    <ConsentContext.Provider value={value}>
      {children}
      {isOpen ? (
        <aside className="consent-panel" aria-labelledby="consent-title" aria-describedby="consent-copy">
          <div className="consent-copy">
            <h2 id="consent-title">Privacy choices</h2>
            <p id="consent-copy">
              MindLab uses necessary local storage for your settings and session. Optional analytics
              and personalized ads stay off unless you allow them. No optional provider is enabled in
              the local build.
            </p>
          </div>
          <div className="consent-options">
            <label>
              <input type="checkbox" checked disabled />
              <span><strong>Necessary</strong><small>Session, guest identity, appearance and accessibility.</small></span>
            </label>
            <label>
              <input type="checkbox" checked={analytics} onChange={(event) => setAnalytics(event.target.checked)} />
              <span><strong>Analytics</strong><small>Anonymous usage measurement when a provider is configured.</small></span>
            </label>
            <label>
              <input type="checkbox" checked={ads} onChange={(event) => setAds(event.target.checked)} />
              <span><strong>Ads</strong><small>Allows an approved web or native ad provider to request an ad.</small></span>
            </label>
          </div>
          <div className="consent-actions">
            <button type="button" className="consent-secondary" onClick={() => save({ analytics: false, ads: false })}>
              Only necessary
            </button>
            <button type="button" className="consent-primary" onClick={() => save({ analytics, ads })}>
              Save choices
            </button>
          </div>
        </aside>
      ) : null}
    </ConsentContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useConsent() {
  const context = useContext(ConsentContext);
  if (!context) {
    throw new Error("useConsent must be used inside ConsentProvider");
  }
  return context;
}
