import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/session';
import { EmptyState } from '@/lib/patterns/empty-state';
import { ImageIcon } from '@/lib/icons';
import { UploadForm } from './upload-form';

export const metadata = { title: 'Gallery' };

export default async function AdminGalleryPage() {
  await requireAdmin(['professor', 'committee_member', 'super_admin']);
  const supabase = await createClient();
  const { data: images } = await supabase
    .from('gallery_images')
    .select('id, caption, file_path, created_at')
    .order('created_at', { ascending: false });

  const withUrls = (images ?? []).map((img) => ({
    ...img,
    url: supabase.storage.from('gallery').getPublicUrl(img.file_path).data.publicUrl,
  }));

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-6 text-lg font-medium">Gallery</h1>
      <UploadForm />

      {withUrls.length === 0 ? (
        <EmptyState icon={ImageIcon} title="No photos yet" message="Upload the first event photo above." />
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {withUrls.map((img) => (
            // eslint-disable-next-line @next/next/no-img-element -- external Supabase Storage URL
            <img key={img.id} src={img.url} alt={img.caption ?? ''} className="aspect-square w-full rounded-[var(--radius)] object-cover" />
          ))}
        </div>
      )}
    </div>
  );
}
