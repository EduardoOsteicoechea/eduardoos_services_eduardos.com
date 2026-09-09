import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { createDevProxyConfig } from "./dev-proxy.mjs";

const devProxy = createDevProxyConfig({
  port: 4321,
  productionApi: "https://eduardoos.com",
});

export default defineConfig({
  site: "https://eduardoos.com",
  output: "static",
  trailingSlash: "never",
  integrations: [
    sitemap({
      filter: (page) =>
        !page.includes("/session") &&
        !page.includes("/admin") &&
        !page.includes("/diagnostics") &&
        !page.includes("/ereport"),
    }),
  ],
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
