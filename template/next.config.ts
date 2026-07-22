import type { NextConfig } from "next";

// This template lives inside the IDP repo (which has its own lockfile for the
// tooling). Pin the workspace root to the template so Next doesn't infer the
// IDP root from multiple lockfiles. Harmless once cloned as a standalone site.
// `__dirname` is available because the config is evaluated as CommonJS.
const nextConfig: NextConfig = {
  turbopack: { root: __dirname },
  // Next's Server Action body limit defaults to 1MB — fine for text-only
  // forms, but the Event Report form uploads real phone photos across 4
  // attachment categories (several MB each), which silently 413'd with a
  // raw, unstyled browser error page instead of a normal form error.
  // Confirmed via Vercel's runtime logs, not guessed: "Error: Body exceeded
  // 1 MB limit" (digest 1060560556@E394, matching the exact error shown on
  // a real device). 25mb covers a handful of real camera photos comfortably
  // without being an open-ended upload target.
  experimental: {
    serverActions: {
      bodySizeLimit: '25mb',
    },
  },
};

export default nextConfig;
