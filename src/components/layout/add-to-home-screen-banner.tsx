"use client";

import { useEffect, useState } from "react";
import { Download, Share2, X, Smartphone } from "lucide-react";

/** Minimal shape of the (non-standard, Chromium-only) beforeinstallprompt event. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_KEY = "ivra_a2hs_banner_dismissed";

function isStandaloneDisplay() {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
}

/**
 * Full-width "Add to Home Screen" banner shown right at the top of the
 * (now public) Home page the first time someone opens the site — before
 * they've signed in or browsed anything — so installing isn't hidden
 * behind the small icon button in the header that only InstallAppButton
 * shows. Dismissing it (or actually installing) hides it for good on that
 * device via localStorage; it never shows at all once the site is already
 * running installed/standalone.
 */
export function AddToHomeScreenBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  // Lazy initializers (not an effect) so this is decided once, synchronously,
  // on first render — same pattern as InstallAppButton's isStandaloneDisplay
  // check — rather than flashing the banner in and then hiding it a tick
  // later.
  const [visible, setVisible] = useState(() => {
    if (isStandaloneDisplay()) return false;
    try {
      return typeof window !== "undefined" && window.localStorage.getItem(DISMISSED_KEY) !== "1";
    } catch {
      // Private-browsing/blocked storage — treat as "not dismissed yet"
      // rather than crashing; worst case it shows again next visit.
      return true;
    }
  });
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
      dismiss();
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  function dismiss() {
    setVisible(false);
    try {
      window.localStorage.setItem(DISMISSED_KEY, "1");
    } catch {}
  }

  async function handleAdd() {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      if (outcome === "accepted") dismiss();
      return;
    }
    if (isIOS) {
      setShowIOSHelp(true);
      return;
    }
    // No native prompt available and not iOS (older browser, or already
    // dismissed by the OS) — nothing useful left to do here.
    dismiss();
  }

  if (!visible) return null;

  return (
    <div className="relative flex items-center gap-3 rounded-2xl border border-[#43e59a]/25 bg-[#101214] p-3.5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#8ff5c4] via-[#43e59a] to-[#0e9f6e] text-[#08090a]">
        <Smartphone className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-white">Add IVRA Events to your Home Screen</p>
        <p className="mt-0.5 text-xs text-[#a2a5a8]">One tap to open next time — no browser bar, just the app.</p>
      </div>
      <button
        type="button"
        onClick={handleAdd}
        className="flex shrink-0 items-center gap-1 rounded-xl bg-gradient-to-br from-[#8ff5c4] via-[#43e59a] to-[#0e9f6e] px-3 py-2 text-xs font-bold text-[#08090a] transition-transform active:scale-95"
      >
        <Download className="h-3.5 w-3.5" /> Add
      </button>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#242629] text-[#a2a5a8] hover:text-white"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      {showIOSHelp && (
        <div className="absolute left-0 right-0 top-full z-40 mt-2 rounded-[var(--radius-md)] border border-border bg-surface p-4 text-sm shadow-[var(--shadow-elevated)]">
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
