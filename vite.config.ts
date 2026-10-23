import { defineConfig } from "vite-plus";
import { loadEnv } from "vite";
import { voidPlugin } from "void";
import { voidVue } from "@void/vue/plugin";

const [nodeMajor = 0, nodeMinor = 0] = process.versions.node
  .split(".")
  .map(Number);
if (nodeMajor < 24 || (nodeMajor === 24 && nodeMinor < 21)) {
  throw new Error(
    `Void requires Node >=24.21.0; detected ${process.version}. Switch Node versions before running this application.`,
  );
}

function configureLocalEmail(mode: string) {
  const local = loadEnv(mode, process.cwd(), "");
  if (!local.EMAIL_FROM?.trim()) {
    process.env.EMAIL_FROM = "Local <no-reply@example.test>";
  }
}

export default defineConfig(({ command, isPreview, mode }) => {
  if (command === "serve" && !isPreview) configureLocalEmail(mode);

  return {
    lint: {
      plugins: ["typescript", "unicorn", "oxc", "vue"],
      categories: { correctness: "error" },
      // Vue templates and TS 6 promise checks remain with ESLint/vue-tsc.
      options: { typeAware: false, typeCheck: false },
    },
    fmt: {
      printWidth: 80,
      ignorePatterns: ["resources/css/tokens-foundation.css"],
    },
    plugins: [
      voidPlugin({ persistTo: process.env.LOCAL_D1_STATE ?? ".void" }),
      voidVue(),
    ],
    environments: {
      client: {
        optimizeDeps: { entries: ["pages/**/*.vue"] },
        build: {
          rollupOptions: { input: { styles: "resources/css/app.css" } },
        },
      },
      void_worker: {
        // Void loads routes lazily; scan their imports before serving requests.
        optimizeDeps: {
          entries: [
            "routes/**/*.ts",
            "middleware/**/*.ts",
            "pages/**/*.server.ts",
          ],
        },
      },
    },
    build: {
      rollupOptions: {
        output: {
          assetFileNames: "assets/app.[ext]",
          chunkFileNames: "assets/[name]-[hash].js",
          entryFileNames: (chunk) =>
            chunk.name === "pages-client"
              ? "assets/app.js"
              : "assets/[name].js",
        },
      },
    },
  };
});
