import { defineConfig } from "vite";
import { voidPlugin } from "void";

export default defineConfig({
  plugins: [voidPlugin({ persistTo: process.env.LOCAL_D1_STATE ?? ".void" })],
  build: {
    rollupOptions: {
      input: "resources/js/app.ts",
      output: {
        assetFileNames: "assets/app.[ext]",
        chunkFileNames: "assets/[name]-[hash].js",
        entryFileNames: "assets/app.js",
      },
    },
  },
});
