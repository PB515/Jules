'use server';

import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/session';
import { logAdminAction } from '@/lib/jules/audit';
import { revalidatePath } from 'next/cache';

export interface ActionResult {
  error?: string;
}

export async function uploadGalleryImageAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin(['professor', 'committee_member', 'super_admin']);
  const file = formData.get('file');
  const caption = String(formData.get('caption') ?? '').trim();
  if (!(file instanceof File) || file.size === 0) return { error: 'Choose a photo to upload.' };

  const supabase = await createClient();

  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `${crypto.randomUUID()}.${ext}`;

  const { error: uploadErr } = await supabase.storage.from('gallery').upload(path, file);
  if (uploadErr) return { error: uploadErr.message };

  // club_id is derived server-side from the caller's own admin row, never
  // trusted from the client — a Professor/Committee Member's upload is
  // tagged to their own club (RLS requires this to manage it later); a
  // Super Admin's upload stays untagged (platform-wide), matching the
  // "club-scoped" meaning gallery_images.club_id was given (0038).
  const { error: insertErr } = await supabase.from('gallery_images').insert({
    caption: caption || null,
    file_path: path,
    uploaded_by: admin.id,
    club_id: admin.role === 'professor' || admin.role === 'committee_member' ? admin.club_id : null,
  });
  if (insertErr) return { error: insertErr.message };

  await logAdminAction(supabase, 'gallery_upload', { file_path: path, caption });

  revalidatePath('/admin/gallery');
  return {};
}
