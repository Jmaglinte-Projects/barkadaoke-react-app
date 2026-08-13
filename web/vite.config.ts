import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      injectRegister: "auto",
      manifest: {
        name: "Barkadaoke",
        short_name: "Barkadaoke",
        description:
          "A shared karaoke queue for barkadas. Join a room, search songs and queue your favorites.",
        theme_color: "#101010",
        background_color: "#101010",
        display: "standalone",
        start_url: "/",

        icons: [
          {
            src: "/assets/img/main-logo_64x64.png",
            sizes: "64x64",
            type: "image/png",
          },
          {
            src: "/assets/img/main-logo_192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/assets/img/main-logo_512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/assets/img/main-logo_maskable_512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "./src"),
    },
  },
});
