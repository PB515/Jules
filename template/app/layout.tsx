import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { site } from "@/lib/site";
import { RegisterSW } from "@/lib/pwa/register-sw";

export const metadata: Metadata = {
  title: {
    default: site.name,
    template: `%s · ${site.name}`,
  },
  description: site.description,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: site.name,
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
  other: {
    // Next 16's `appleWebApp.capable` only emits the modern
    // `mobile-web-app-capable` tag. Older iOS/Safari versions only honor
    // the legacy apple-prefixed tag to treat a home-screen shortcut as a
    // real standalone app (hiding Safari's chrome) instead of a bookmark —
    // without it, `navigator.standalone` can stay false even after "Add to
    // Home Screen", which would make pwa-gate.tsx never pass on those
    // devices. Emitted explicitly so both old and new iOS are covered.
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#faf7f2",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-background text-foreground font-body">
        {/*
          beforeinstallprompt commonly fires before React hydrates on a real
          phone, so a useEffect-attached listener in InstallButton can miss
          it entirely — the browser only fires it once per page load, with
          no replay for a late listener. Captured here, before hydration,
          onto window so InstallButton can pick up an already-fired event.
        */}
        <Script id="capture-install-prompt" strategy="beforeInteractive">
          {`window.__deferredInstallPrompt = null;
            window.addEventListener('beforeinstallprompt', function (e) {
              e.preventDefault();
              window.__deferredInstallPrompt = e;
              window.dispatchEvent(new Event('synergy-install-prompt-ready'));
            });`}
        </Script>
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
