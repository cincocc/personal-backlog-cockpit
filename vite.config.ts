import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig(({ command }) => ({
  plugins: [react()],
  // GitHub Pages 项目站路径；本地开发仍用根路径，避免 5173 打不开
  base: command === "build" ? "/personal-backlog-cockpit/" : "/",
  test: {
    environment: "node",
  },
}));
