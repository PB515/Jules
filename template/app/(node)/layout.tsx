import { requireStudent } from '@/lib/auth/session';
import { PwaGate } from './pwa-gate';
import { NodeNav } from './node-nav-client';

export default async function NodeLayout({ children }: { children: React.ReactNode }) {
  await requireStudent();

  return (
    <PwaGate>
      <div className="flex min-h-screen flex-1 flex-col bg-background">
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col pb-20">{children}</main>
        <NodeNav />
      </div>
    </PwaGate>
  );
}
