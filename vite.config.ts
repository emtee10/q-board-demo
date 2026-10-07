import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import eventConfig from "./event.config";
import { renderEventHtml } from "./src/lib/html";
export default defineConfig({
  plugins: [
    react(),
    {
      name: "qboard-event-metadata",
      transformIndexHtml: {
        order: "pre",
        handler: (html) => renderEventHtml(html, eventConfig),
      },
    },
  ],
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
  },
});
