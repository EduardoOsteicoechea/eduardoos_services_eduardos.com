import basicSsl from "@vitejs/plugin-basic-ssl";

function devProxyBanner(target, port, useHttps, useProdProxy) {
  return {
    name: "dev-proxy-banner",
    configureServer(server) {
      server.httpServer?.once("listening", () => {
        const scheme = useHttps ? "https" : "http";
        console.log("");
        console.log(`  API proxy   /api → ${target}`);
        console.log(`  Dev URL     ${scheme}://127.0.0.1:${port}/`);
        if (useHttps) {
          console.log("  Note        Open HTTPS (not HTTP) and accept the local certificate warning.");
        }
        if (!useProdProxy) {
          console.log("  Note        Local API mode. Keep the Go server running on the proxy target.");
        }
        console.log("");
      });
    },
  };
}

export function createDevProxyConfig({ port, productionApi }) {
  const apiProxyTarget = (process.env.API_PROXY_TARGET || productionApi).trim().replace(/\/$/, "");
  const useHttpsDev = true;
  const useProdProxy = apiProxyTarget.startsWith("https://");

  return {
    port,
    vitePlugins: [
      basicSsl(),
      devProxyBanner(apiProxyTarget, port, useHttpsDev, useProdProxy),
    ],
    proxy: {
      "/api": {
        target: apiProxyTarget,
        changeOrigin: true,
        secure: apiProxyTarget.startsWith("https://"),
      },
    },
  };
}
