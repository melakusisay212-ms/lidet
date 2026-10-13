import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Relative base is required: Capacitor serves the bundle from https://localhost/ inside the WebView.
export default defineConfig({
  base: "./",
  plugins: [react()],
  build: { outDir: "dist", sourcemap: false, target: "es2020" },
});
