import { defineConfig } from "astro/config";
import { createDevProxyConfig } from "./dev-proxy.mjs";

const devProxy = createDevProxyConfig({
  port: 4321,
  productionApi: "https://eduardoos.com",
});

export default defineConfig({
  output: "static",
  trailingSlash: "never",
  server: {
    port: devProxy.port,
    host: "127.0.0.1",
    strictPort: true,
  },
  vite: {
    plugins: devProxy.vitePlugins,
    server: {
      proxy: devProxy.proxy,
    },
  },
});
