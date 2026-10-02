import { cloudflare } from "@cloudflare/vite-plugin";
import devServer, { defaultOptions } from "@hono/vite-dev-server";
import nodeAdapter from "@hono/vite-dev-server/node";
import { defineConfig } from "vite";

export default defineConfig(({ command, mode }) => {
  if (command === "serve") {
    return {
      plugins: [
        devServer({
          adapter: nodeAdapter(),
          entry: "src/runtime/node.ts",
          export: "app",
          exclude: [...defaultOptions.exclude, /^\/resources\/(css|js)\//],
        }),
      ],
    };
  }

  if (mode === "client") {
    return {
      build: {
        copyPublicDir: true,
        emptyOutDir: true,
        outDir: "dist/client",
        rollupOptions: {
          input: "resources/js/app.ts",
          output: {
            assetFileNames: "assets/app.[ext]",
            chunkFileNames: "assets/[name]-[hash].js",
            entryFileNames: "assets/app.js",
          },
        },
      },
    };
  }

  return {
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
    plugins: [cloudflare()],
  };
});
