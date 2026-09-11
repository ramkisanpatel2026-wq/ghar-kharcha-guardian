import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

/**
 * Shows a small banner whenever the device loses its connection and reloads
 * the current page automatically once the connection is back. Keeps the app
 * usable (no crash, no blank screen) in poor-network conditions.
 */
export function OfflineNotice() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();

    const onOnline = () => {
      setOffline(false);
      // Refresh data that failed while the device was offline.
      window.location.reload();
    };
    const onOffline = () => setOffline(true);

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-0 z-[100] flex items-center justify-center gap-2 bg-destructive px-4 py-3 text-sm font-medium text-destructive-foreground"
    >
      <WifiOff className="h-4 w-4" aria-hidden="true" />
      No internet — इंटरनेट नहीं है. Reconnecting automatically…
    </div>
  );
}
