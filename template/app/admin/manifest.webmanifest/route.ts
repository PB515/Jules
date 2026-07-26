import { site } from '@/lib/site';

/**
 * Admin PWA manifest — a second, distinct installable identity for
 * Professor/Committee Member, scoped to /admin. Next's special-file
 * `manifest.ts` convention only picks up ONE manifest at the app root
 * (confirmed via a real build — a nested app/admin/manifest.ts silently
 * produced no route at all), so this is a plain Route Handler instead,
 * same pattern as app/sw.js/route.ts.
 *
 * Deliberately NOT the same manifest as the student one (app/manifest.ts):
 * different name, different start_url (the student one points at
 * /dashboard, which an admin can't open at all), and a visually distinct
 * icon (icon-admin-*.png — a real generated executive-palette mark,
 * decision "frontend overhaul", replacing the earlier hand-coded SVG) so an
 * installed home-screen icon never reads as "the student app" to a
 * professor or committee member. The student PWA and its phone-only gate
 * are completely untouched by this.
 */
export async function GET() {
  const manifest = {
    name: `${site.name} Staff`,
    short_name: `${site.name} Staff`,
    description: 'The staff side of Synergy: live event tracking and Event Report authoring.',
    start_url: '/admin',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#ffffff',
    icons: [
      { src: '/icons/icon-admin-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-admin-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-admin-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };

  return Response.json(manifest, {
    headers: { 'Content-Type': 'application/manifest+json' },
  });
}
