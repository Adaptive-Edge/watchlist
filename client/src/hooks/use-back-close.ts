import { useEffect } from "react";
import { App } from "@capacitor/app";

// Close an overlay/dialog on the Android hardware/TV-remote back button.
// Radix handles Escape for web; this covers Capacitor's backButton event,
// which otherwise leaves TV users trapped in an open dialog.
export function useBackClose(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    let remove: (() => void) | null = null;
    App.addListener("backButton", () => onClose()).then((handle) => {
      remove = () => handle.remove();
    });
    return () => {
      remove?.();
    };
  }, [open, onClose]);
}
