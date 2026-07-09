'use server';

import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/session';
import { revalidatePath } from 'next/cache';

export interface ActionResult {
  error?: string;
}

export async function uploadGalleryImageAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireAdmin(['owner', 'officer']);
  const file = formData.get('file');
  const caption = String(formData.get('caption') ?? '').trim();
  if (!(file instanceof File) || file.size === 0) return { error: 'Choose a photo to upload.' };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `${crypto.randomUUID()}.${ext}`;

  const { error: uploadErr } = await supabase.storage.from('gallery').upload(path, file);
  if (uploadErr) return { error: uploadErr.message };

  const { error: insertErr } = await supabase.from('gallery_images').insert({
    caption: caption || null,
    file_path: path,
    uploaded_by: user?.id,
  });
  if (insertErr) return { error: insertErr.message };

  revalidatePath('/admin/gallery');
  return {};
}
