import { defineConfig } from "astro/config";
import basicSsl from "@vitejs/plugin-basic-ssl";

const DEV_PORT = 4321;
const PRODUCTION_API = "https://eduardoos.com";

const apiProxyTarget = (process.env.API_PROXY_TARGET || PRODUCTION_API).trim().replace(/\/$/, "");
const useHttpsDev = apiProxyTarget.startsWith("https://");

export default defineConfig({
  output: "static",
  trailingSlash: "never",
  server: {
    port: DEV_PORT,
    host: "127.0.0.1",
  },
  vite: {
    plugins: useHttpsDev ? [basicSsl()] : [],
    server: {
      proxy: {
        "/api": {
          target: apiProxyTarget,
          changeOrigin: true,
          secure: apiProxyTarget.startsWith("https://"),
        },
      },
    },
  },
});
