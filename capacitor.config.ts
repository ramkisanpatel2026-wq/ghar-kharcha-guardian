import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Ghar Kharcha AI — Android (Capacitor) configuration.
 *
 * The app is a TanStack Start SSR application (server functions, /api routes,
 * Lovable Cloud auth), so the Android shell loads the deployed site rather than
 * a purely static bundle. `webDir` still points at the client build output so
 * `npx cap sync` has assets to copy.
 */
const config: CapacitorConfig = {
  appId: "com.gharkharcha.ai",
  appName: "Ghar Kharcha AI",
  webDir: "dist/client",
  android: {
    allowMixedContent: false,
  },
  server: {
    url: "https://ghar-kharcha-guardian.lovable.app",
    cleartext: false,
    androidScheme: "https",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: "#0F5132",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0F5132",
    },
  },

};

export default config;
