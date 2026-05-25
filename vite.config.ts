import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const parsedDevPort = Number.parseInt(env.VITE_DEV_PORT || "", 10);
  const devPort = Number.isFinite(parsedDevPort) ? parsedDevPort : 8080;

  return {
    server: {
      host: env.VITE_DEV_HOST || "::",
      port: devPort,
      hmr: {
        overlay: false,
      },
      
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
