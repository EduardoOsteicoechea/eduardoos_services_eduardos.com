import { defineConfig } from "astro/config";

export default defineConfig({
  output: "static",
  trailingSlash: "never",
  server: {
    port: 4321,
    host: "127.0.0.1",
  },
  vite: {
    server: {
      proxy: {
        "/api": {
          target: "http://127.0.0.1:8081",
          changeOrigin: true,
        },
      },
    },
  },
});
