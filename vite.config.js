import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? "/demo-schedule-booking/" : "/",
  plugins: [vue()],
  server: { host: "0.0.0.0", allowedHosts: ["terminal.local"] },
  build: { outDir: "dist", sourcemap: true },
});
