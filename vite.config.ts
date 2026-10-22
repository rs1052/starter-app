import { defineConfig, loadEnv } from "vite";
import { voidPlugin } from "void";

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
    plugins: [voidPlugin({ persistTo: process.env.LOCAL_D1_STATE ?? ".void" })],
    environments: {
      void_worker: {
        // Void loads routes lazily; scan their imports before serving requests.
        optimizeDeps: { entries: ["routes/**/*.ts", "middleware/**/*.ts"] },
      },
    },
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
  };
});
