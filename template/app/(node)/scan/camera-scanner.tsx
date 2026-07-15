'use client';
/**
 * Live in-app camera QR scanner — decodes frames with jsQR (pure JS, no
 * BarcodeDetector dependency since that API doesn't exist on Safari/iOS,
 * which a real share of students will be on). Expects the same absolute
 * `${site.url}/scan?e=<event>&t=<token>` link the admin's displayed QR
 * already encodes (station-client.tsx) — decoding just extracts e/t and
 * hands them to the caller's existing redemption flow, it never re-derives
 * the redeem logic itself.
 */
import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { CircleX } from '@/lib/icons';

export function CameraScanner({
  onScan,
  onClose,
}: {
  onScan: (eventId: string, token: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const scannedRef = useRef(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let rafId: number;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      } catch (e) {
        const name = e instanceof Error ? e.name : '';
        if (name === 'NotAllowedError') {
          setError('Camera access was denied. Allow camera access in your browser/PWA settings, or check in manually below.');
        } else if (name === 'NotFoundError') {
          setError('No camera found on this device.');
        } else {
          setError('Could not open the camera. Try checking in manually below.');
        }
        return;
      }

      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();

      const tick = () => {
        if (scannedRef.current) return;
        if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(frame.data, frame.width, frame.height);
          if (code) {
            const parsed = parseSynergyScanLink(code.data);
            if (parsed) {
              scannedRef.current = true;
              onScan(parsed.eventId, parsed.token);
              return;
            }
          }
        }
        rafId = requestAnimationFrame(tick);
      };
      rafId = requestAnimationFrame(tick);
    }

    start();

    return () => {
      cancelAnimationFrame(rafId);
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-black">
        <video ref={videoRef} playsInline muted className="aspect-square w-full object-cover" />
        <div className="pointer-events-none absolute inset-8 rounded-2xl border-2 border-gold/70" />
      </div>
      {error ? (
        <div className="flex items-center gap-2 rounded-[var(--radius)] border border-accent/40 bg-card p-3 text-sm text-accent">
          <CircleX className="size-4 shrink-0" aria-hidden />
          {error}
        </div>
      ) : (
        <p className="text-center text-xs text-tertiary">Point your camera at the event&apos;s QR code.</p>
      )}
      <button
        type="button"
        onClick={onClose}
        className="rounded-[var(--radius)] border border-border py-2.5 text-sm text-muted"
      >
        Cancel
      </button>
    </div>
  );
}

function parseSynergyScanLink(text: string): { eventId: string; token: string } | null {
  try {
    const url = new URL(text);
    if (!url.pathname.endsWith('/scan')) return null;
    const eventId = url.searchParams.get('e');
    const token = url.searchParams.get('t');
    if (!eventId || !token) return null;
    return { eventId, token: token.toUpperCase() };
  } catch {
    return null;
  }
}
