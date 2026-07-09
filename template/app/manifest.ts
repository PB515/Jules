import type { MetadataRoute } from 'next';
import { site } from '@/lib/site';

/**
 * PWA manifest (Tier-2 #8). Next serves this at /manifest.webmanifest from the
 * App Router metadata route. Add the icons to public/icons/ and set the colours
 * to your brand tokens before launch. See docs/modules/pwa.md.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: site.name,
    short_name: site.name,
    description: site.description,
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#070b12',
    theme_color: '#070b12',
    // TBD: swap for real 192/512/maskable PNGs before launch (docs 06b). SVG
    // placeholder works as an installable icon in Chromium/Android today.
    icons: [
      { src: '/icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
    ],
  };
}
