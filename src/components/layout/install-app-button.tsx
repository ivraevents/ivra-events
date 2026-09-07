"use client";

import { useEffect, useState } from "react";
import { Download, Share2, X } from "lucide-react";

/** Minimal shape of the (non-standard, Chromium-only) beforeinstallprompt event. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandaloneDisplay() {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
}

/**
 * "Add to Home Screen" button for the logged-in app shell.
 * - Android / Chrome / Edge: captures the native beforeinstallprompt event
 *   and triggers it directly.
 * - iOS Safari (no beforeinstallprompt support at all): shows a small
 *   instructions popover, since iOS only allows installing via the share
 *   sheet.
 * - Already installed / unsupported browser: renders nothing.
 */
export function InstallAppButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(() => isStandaloneDisplay());
  const [isIOS] = useState(
    () => typeof window !== "undefined" && /iphone|ipad|ipod/i.test(window.navigator.userAgent)
  );
  const [showIOSHelp, setShowIOSHelp] = useState(false);

  useEffect(() => {
    function onBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }
    function onInstalled() {
      setInstalled(true);
      setDeferredPrompt(null);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed || (!deferredPrompt && !isIOS)) return null;

  async function handleClick() {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") setInstalled(true);
      setDeferredPrompt(null);
      return;
    }
    if (isIOS) setShowIOSHelp(true);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleClick}
        title="Add to Home Screen"
        aria-label="Add to Home Screen"
        className="flex h-9 w-9 items-center justify-center rounded-full text-charcoal-500 hover:bg-surface-muted"
      >
        <Download className="h-4 w-4" />
      </button>

      {showIOSHelp && (
        <div className="absolute right-0 z-40 mt-2 w-64 rounded-[var(--radius-md)] border border-border bg-surface p-4 text-sm shadow-[var(--shadow-elevated)]">
          <button
            type="button"
            onClick={() => setShowIOSHelp(false)}
            className="absolute right-2 top-2 rounded-full p-1 text-charcoal-400 hover:bg-surface-muted"
            aria-label="Close"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <p className="font-semibold text-navy-900">Add to Home Screen</p>
          <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
            <Share2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Tap the Share icon in Safari, then choose &quot;Add to Home Screen&quot;.
          </p>
        </div>
      )}
    </div>
  );
}
