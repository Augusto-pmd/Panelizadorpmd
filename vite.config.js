import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base "./" => rutas relativas: la app funciona en cualquier subpath de
// GitHub Pages (https://augusto-pmd.github.io/Panelizadorpmd/) sin hardcodear
// el nombre del repo. En dev se sirve normalmente desde "/".
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === "build" ? "./" : "/",
}));
