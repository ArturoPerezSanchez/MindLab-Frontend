import { defineConfig } from "vitest/config";
import { fileURLToPath, URL } from "node:url";

/**
 * Vitest runs against the pure game logic in `src/games/<game>/game.ts`.
 *
 * Those modules have no DOM or network dependency, so the default node
 * environment is enough and the suite stays fast. Component tests would need
 * jsdom and Testing Library; add them only when there is a reason to.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
