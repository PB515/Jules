import { createClient } from '@/lib/supabase/server';
import { GalleryPlaceholder } from '@/lib/components/gallery-placeholder';

export const metadata = { title: 'Gallery' };

export default async function GalleryPage() {
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
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-medium">Gallery</h1>
        <p className="mt-1 text-sm text-muted">Moments from past meetings, sessions, and Surges.</p>
      </div>

      {withUrls.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border p-10 text-center">
          <GalleryPlaceholder className="h-28 w-40" />
          <div>
            <h3 className="text-base font-medium">Real photos coming soon</h3>
            <p className="mt-1 max-w-sm text-sm text-tertiary">
              The Gallery is being filled in. Check back after the next event.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {withUrls.map((img) => (
            <figure key={img.id} className="overflow-hidden rounded-[var(--radius)] border border-border bg-card">
              {/* eslint-disable-next-line @next/next/no-img-element -- external Supabase Storage URL, no next/image domain config needed */}
              <img src={img.url} alt={img.caption ?? ''} className="aspect-square w-full object-cover" />
              {img.caption ? <figcaption className="p-2 text-xs text-tertiary">{img.caption}</figcaption> : null}
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}
