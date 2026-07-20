'use client';
/**
 * Wires the real `beforeinstallprompt` event (Chrome/Edge on Android) so a
 * tap actually triggers the OS install dialog. iOS Safari never fires this
 * event at all — the manual "Add to Home Screen" instructions on this page
 * are the only path there, so this button simply doesn't render for it.
 *
 * The event is captured pre-hydration in app/layout.tsx's inline script
 * (window.__deferredInstallPrompt) — on a real phone the browser often
 * fires it before this component's useEffect ever attaches, and the event
 * doesn't replay for a late listener, which is why the button could stay
 * permanently hidden even though the browser's own menu still offers
 * "Install app" (that menu entry isn't gated by this same JS event).
 */
import { useEffect, useState } from 'react';
import { Download } from '@/lib/icons';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

declare global {
  interface Window {
    __deferredInstallPrompt?: BeforeInstallPromptEvent | null;
  }
}

export function InstallButton({ label = 'Install Synergy' }: { label?: string }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (window.__deferredInstallPrompt) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- picking up an event captured before hydration, not a derived-state loop
      setDeferred(window.__deferredInstallPrompt);
    }

    function onReady() {
      if (window.__deferredInstallPrompt) setDeferred(window.__deferredInstallPrompt);
    }
    function onPrompt(e: Event) {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    }
    window.addEventListener('synergy-install-prompt-ready', onReady);
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => {
      window.removeEventListener('synergy-install-prompt-ready', onReady);
      window.removeEventListener('beforeinstallprompt', onPrompt);
    };
  }, []);

  if (!deferred) return null;

  return (
    <button
      onClick={async () => {
        await deferred.prompt();
        window.__deferredInstallPrompt = null;
        setDeferred(null);
      }}
      className="flex items-center gap-2 rounded-[var(--radius)] bg-gold px-5 py-3 text-sm font-medium text-gold-foreground"
    >
      <Download className="size-4" aria-hidden />
      {label}
    </button>
  );
}
