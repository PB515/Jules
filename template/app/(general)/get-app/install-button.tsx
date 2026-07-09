'use client';
/**
 * Wires the real `beforeinstallprompt` event (Chrome/Edge on Android) so a
 * tap actually triggers the OS install dialog. iOS Safari never fires this
 * event at all — the manual "Add to Home Screen" instructions on this page
 * are the only path there, so this button simply doesn't render for it.
 */
import { useEffect, useState } from 'react';
import { Download } from '@/lib/icons';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

export function InstallButton() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    function onPrompt(e: Event) {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    }
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  if (!deferred) return null;

  return (
    <button
      onClick={async () => {
        await deferred.prompt();
        setDeferred(null);
      }}
      className="flex items-center gap-2 rounded-[var(--radius)] bg-gold px-5 py-3 text-sm font-medium text-gold-foreground"
    >
      <Download className="size-4" aria-hidden />
      Install Jules
    </button>
  );
}
