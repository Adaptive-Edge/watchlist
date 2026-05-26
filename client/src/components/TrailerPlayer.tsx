import { X } from "lucide-react";
import { useEffect } from "react";
import { App } from "@capacitor/app";

interface TrailerPlayerProps {
  trailerKey: string;
  title: string;
  onClose: () => void;
}

export function TrailerPlayer({ trailerKey, title, onClose }: TrailerPlayerProps) {
  useEffect(() => {
    // Keyboard escape (browser / web)
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "GoBack" || e.key === "BrowserBack") onClose();
    };
    window.addEventListener("keydown", handleKey);

    // Android hardware back button (TV remote back, phone back gesture)
    let backListener: (() => void) | null = null;
    App.addListener("backButton", () => onClose()).then(handle => {
      backListener = () => handle.remove();
    });

    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKey);
      backListener?.();
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">
      <button
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus
        onClick={onClose}
        className="absolute top-4 right-4 z-[101] w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
      >
        <X className="w-6 h-6 text-white" />
      </button>
      <iframe
        src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&rel=0&modestbranding=1`}
        title={`${title} trailer`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="w-full h-full max-h-[100vh]"
        style={{ border: "none" }}
      />
    </div>
  );
}
