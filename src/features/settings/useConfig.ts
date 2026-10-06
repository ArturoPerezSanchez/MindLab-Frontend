import { useCallback, useEffect, useState } from "react";

const THRONES_PATTERNS_KEY = "thrones-show-patterns";
const CONFIG_CHANGED_EVENT = "logic-games-config-change";

function readStoredBoolean(key: string, fallback = false): boolean {
  try {
    const stored = window.localStorage.getItem(key);
    return stored === null ? fallback : stored === "true";
  } catch {
    return fallback;
  }
}

function writeStoredBoolean(key: string, value: boolean): void {
  try {
    window.localStorage.setItem(key, String(value));
    window.dispatchEvent(new Event(CONFIG_CHANGED_EVENT));
  } catch {
    // Ignore storage failures; the in-memory state still updates for this session.
  }
}

export function getStoredThronesPatterns(): boolean {
  return readStoredBoolean(THRONES_PATTERNS_KEY);
}

export function useThronesPatternsSetting() {
  const [enabled, setEnabledState] = useState(() => getStoredThronesPatterns());

  useEffect(() => {
    const refresh = () => setEnabledState(getStoredThronesPatterns());

    window.addEventListener("storage", refresh);
    window.addEventListener(CONFIG_CHANGED_EVENT, refresh);

    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener(CONFIG_CHANGED_EVENT, refresh);
    };
  }, []);

  const setEnabled = useCallback((nextValue: boolean | ((current: boolean) => boolean)) => {
    setEnabledState((current) => {
      const resolved = typeof nextValue === "function" ? nextValue(current) : nextValue;
      writeStoredBoolean(THRONES_PATTERNS_KEY, resolved);
      return resolved;
    });
  }, []);

  return [enabled, setEnabled] as const;
}
