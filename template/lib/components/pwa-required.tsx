import Link from 'next/link';
import { Smartphone } from '@/lib/icons';

/**
 * The shared "this only works on your phone" screen — used by both gate
 * layers (proxy.ts's server redirect to /mobile-required, and the client-side
 * PwaGate in app/(node)/layout.tsx). Same message either way, so a student
 * never sees two different explanations for the same rule.
 */
export function PwaRequired() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 py-12 text-center">
      <Smartphone className="size-10 text-gold" aria-hidden />
      <div>
        <h1 className="text-lg font-medium">Jules is built for your phone</h1>
        <p className="mt-2 max-w-sm text-sm text-muted">
          To keep quizzes fair and focused, one device, nothing else open, the student side of Jules
          only runs as an installed app on your phone, not in a laptop browser.
        </p>
      </div>
      <Link
        href="/get-app"
        className="rounded-[var(--radius)] bg-gold px-5 py-3 text-sm font-medium text-gold-foreground"
      >
        Get the app on your phone
      </Link>
    </main>
  );
}
