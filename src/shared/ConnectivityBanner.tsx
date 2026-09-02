import { useCallback, useEffect, useState } from "react";
import { CloudOff, WifiOff } from "lucide-react";
import { apiPath } from "@/shared/api";

type Connectivity = "checking" | "online" | "offline" | "api-down";

export function ConnectivityBanner() {
  const [status, setStatus] = useState<Connectivity>(() =>
    navigator.onLine ? "checking" : "offline",
  );

  const check = useCallback(async () => {
    if (!navigator.onLine) {
      setStatus("offline");
      return;
    }
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 5_000);
    try {
      const response = await fetch(apiPath("/ready"), {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
      });
      setStatus((current) => {
        if (response.ok && (current === "offline" || current === "api-down")) {
          window.dispatchEvent(new Event("mindlab:api-online"));
        }
        return response.ok ? "online" : "api-down";
      });
    } catch {
      setStatus("api-down");
    } finally {
      window.clearTimeout(timeout);
    }
  }, []);

  useEffect(() => {
    const handleOffline = () => setStatus("offline");
    const handleOnline = () => void check();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void check();
      }
    };
    void check();
    const interval = window.setInterval(() => void check(), 30_000);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [check]);

  if (status === "checking" || status === "online") {
    return null;
  }

  return (
    <div className="connectivity-banner" role="status">
      {status === "offline" ? <WifiOff aria-hidden="true" size={17} /> : <CloudOff aria-hidden="true" size={17} />}
      <span>
        {status === "offline"
          ? "You are offline. Open games remain visible, but new puzzles and multiplayer need a connection."
          : "The MindLab server is unavailable. Your saved session has been kept; try again shortly."}
      </span>
      <button type="button" onClick={() => void check()}>Retry</button>
    </div>
  );
}
