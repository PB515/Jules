'use client';
/**
 * next/dynamic's ssr:false option can only be configured from a Client
 * Component (Next 16 rejects it from a Server Component's dynamic() call)
 * — this tiny wrapper is that boundary, so profile/page.tsx itself stays a
 * plain async Server Component.
 */
import dynamic from 'next/dynamic';
import type { Tier } from '@/lib/supabase/database.types';

const AvatarScene = dynamic(() => import('./avatar-scene').then((m) => m.AvatarScene), { ssr: false });

export function AvatarSceneLoader({ tier }: { tier: Tier }) {
  return <AvatarScene tier={tier} />;
}
