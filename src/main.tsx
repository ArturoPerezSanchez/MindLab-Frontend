import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "@/app/App";
import { AuthProvider } from "@/features/auth/AuthProvider";
import { ConsentProvider } from "@/features/privacy/ConsentProvider";
import { SkinProvider } from "@/features/skins/SkinProvider";
import { AppErrorBoundary } from "@/shared/ErrorBoundary";
import "@/styles/global.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppErrorBoundary>
      <ConsentProvider>
        <AuthProvider>
          <SkinProvider>
            <App />
          </SkinProvider>
        </AuthProvider>
      </ConsentProvider>
    </AppErrorBoundary>
  </StrictMode>,
);
