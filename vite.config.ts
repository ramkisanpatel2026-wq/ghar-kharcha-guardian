import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    VitePWA({
      strategies: "generateSW",
      registerType: "autoUpdate",
      injectRegister: null,
      filename: "sw.js",
      manifest: false,
      outDir: "dist/client",
      devOptions: { enabled: false },
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,svg,ico,woff2}"],
        navigateFallbackDenylist: [/^\/~oauth/, /^\/api\//],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            // Never intercept OAuth callbacks, server functions or API routes:
            // a cached shell here breaks OAuth state verification.
            urlPattern: ({ request, url, sameOrigin }) =>
              request.mode === "navigate" &&
              !(
                sameOrigin &&
                (url.pathname.startsWith("/~oauth") ||
                  url.pathname.startsWith("/api/") ||
                  url.pathname.startsWith("/_serverFn"))
              ),

            handler: "NetworkFirst",
            options: {
              cacheName: "html-navigations",
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 32, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
          {
            urlPattern: ({ request, sameOrigin }) =>
              sameOrigin &&
              ["style", "script", "worker", "font", "image"].includes(request.destination),
            handler: "CacheFirst",
            options: {
              cacheName: "static-assets",
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
});
