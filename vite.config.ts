import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  base: "/personal-backlog-cockpit/",
  test: {
    environment: "node",
  },
});
