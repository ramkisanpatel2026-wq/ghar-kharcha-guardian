import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Ghar Kharcha — Android (Capacitor) configuration.
 *
 * The app is a TanStack Start SSR application (server functions, /api routes,
 * Lovable Cloud auth), so the Android shell loads the deployed site INSIDE the
 * native Capacitor WebView. It never hands navigation to Chrome or any external
 * browser: `allowNavigation` keeps every in-app URL inside the WebView.
 *
 * `webDir` points at the client build output so `npx cap sync` has assets to copy.
 */
const config: CapacitorConfig = {
  appId: "com.gharkharcha.app",
  appName: "Ghar Kharcha",
  webDir: "dist/client",
  android: {
    allowMixedContent: false,
    // Keep links inside the native WebView instead of launching Chrome.
    webContentsDebuggingEnabled: false,
    backgroundColor: "#0F5132",
  },
  server: {
    url: "https://ghar-kharcha-guardian.lovable.app",
    hostname: "ghar-kharcha-guardian.lovable.app",
    cleartext: false,
    androidScheme: "https",
    // Any URL matching these patterns is loaded in-app; everything else is
    // only opened when the user explicitly taps an external link.
    allowNavigation: [
      "ghar-kharcha-guardian.lovable.app",
      "*.lovable.app",
      "*.supabase.co",
    ],
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: false,
      backgroundColor: "#0F5132",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0F5132",
      overlaysWebView: false,
    },
  },
};

export default config;
