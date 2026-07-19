import type { Metadata } from 'next';
import { site } from '@/lib/site';

/**
 * Wraps every /admin route (both /admin/login and everything under
 * (protected) — route groups don't create a URL segment, so this layout
 * applies to both) purely to link the admin-scoped manifest instead of the
 * root layout's student one. No visual chrome here — /admin/login and the
 * (protected) layout each own their own.
 */
export const metadata: Metadata = {
  manifest: '/admin/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: `${site.name} Staff`,
  },
  icons: {
    icon: '/icons/icon-admin-192.png',
    apple: '/icons/icon-admin-192.png',
  },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
