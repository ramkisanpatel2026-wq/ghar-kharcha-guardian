/**
 * Native Android (Capacitor) integration.
 *
 * All plugin imports are dynamic so the web build never loads native code and
 * SSR is untouched. Safe to call unconditionally from a `useEffect`.
 */

type Cleanup = () => void;

export function isNativeApp(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return Boolean(cap?.isNativePlatform?.());
}

/**
 * Sets up status bar styling, splash-screen hide and Android hardware
 * back-button handling (go back in history; only exit at the app root).
 * Returns a cleanup function.
 */
export function initNativeShell(): Cleanup {
  if (!isNativeApp()) return () => {};

  let disposed = false;
  const cleanups: Cleanup[] = [];

  void (async () => {
    try {
      const [{ StatusBar, Style }, { SplashScreen }, { App }] = await Promise.all([
        import("@capacitor/status-bar"),
        import("@capacitor/splash-screen"),
        import("@capacitor/app"),
      ]);

      try {
        await StatusBar.setOverlaysWebView({ overlay: false });
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: "#0F5132" });
      } catch {
        /* status bar is unavailable on some devices — never break the app */
      }

      try {
        await SplashScreen.hide({ fadeOutDuration: 250 });
      } catch {
        /* ignore */
      }

      if (disposed) return;

      const handle = await App.addListener("backButton", ({ canGoBack }) => {
        if (canGoBack || window.history.length > 1) {
          window.history.back();
        } else {
          void App.exitApp();
        }
      });
      cleanups.push(() => {
        void handle.remove();
      });
    } catch {
      /* plugins missing (web build) — no-op */
    }
  })();

  return () => {
    disposed = true;
    cleanups.forEach((fn) => fn());
  };
}

/**
 * Opens an external URL. On native it uses the system browser deliberately
 * (explicit user action only); on web it opens a new tab.
 */
export function openExternalUrl(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}
