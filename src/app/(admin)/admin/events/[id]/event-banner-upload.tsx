"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { updateEventBanner } from "@/lib/actions/admin-events";
import { compressImage } from "@/lib/compress-image";
import { ImagePlus, Trash2 } from "lucide-react";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_MB = 5;

/**
 * The event's cover photo — shown on the Home screen's market cards and
 * the public event page. Uploads straight to the public "event-banners"
 * storage bucket (RLS there only allows admins to write, everyone to
 * read — see 0020_storage.sql), then just saves the resulting public URL
 * on the event row via updateEventBanner.
 *
 * The card layout everywhere this photo appears (Home cards, the public
 * event page) always crops to a fixed-height box with object-cover, so
 * whatever aspect ratio is uploaded here never stretches or squashes —
 * it's cropped consistently instead. Before uploading, the file is
 * resized/re-encoded client-side (see compress-image.ts) so a multi-MB
 * phone photo doesn't upload at full size.
 */
export function EventBannerUpload({ eventId, bannerUrl }: { eventId: string; bannerUrl: string | null }) {
  const [preview, setPreview] = useState<string | null>(bannerUrl);
  const [status, setStatus] = useState<"idle" | "compressing" | "uploading">("idle");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Only JPG, PNG or WEBP images are allowed.");
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`Image must be under ${MAX_SIZE_MB}MB.`);
      return;
    }

    // Show the picked file immediately (before upload finishes) so the
    // admin gets instant feedback on what they chose.
    const localPreview = URL.createObjectURL(file);
    setPreview(localPreview);

    setStatus("compressing");
    const optimized = await compressImage(file);

    setStatus("uploading");
    const supabase = createClient();
    const ext = optimized.name.split(".").pop() || "jpg";
    const path = `${eventId}/banner-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("event-banners")
      .upload(path, optimized, { contentType: optimized.type, upsert: false });
    if (uploadError) {
      setError(uploadError.message);
      setStatus("idle");
      return;
    }

    const { data: pub } = supabase.storage.from("event-banners").getPublicUrl(path);
    const res = await updateEventBanner(eventId, pub.publicUrl);
    setStatus("idle");
    URL.revokeObjectURL(localPreview);
    if (res?.error) {
      setError(res.error);
      return;
    }
    setPreview(pub.publicUrl);
  }

  async function handleRemove() {
    setError(null);
    setStatus("uploading");
    const res = await updateEventBanner(eventId, null);
    setStatus("idle");
    if (res?.error) {
      setError(res.error);
      return;
    }
    setPreview(null);
  }

  const busy = status !== "idle";

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium text-navy-900">Event Photo</p>
      <div className="flex items-center gap-4">
        <div className="flex h-24 w-40 shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface-muted">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element -- remote/storage banner or local blob preview, arbitrary source
            <img src={preview} alt="Event banner" className="h-full w-full object-cover" />
          ) : (
            <span className="text-[10px] text-muted-foreground">No photo yet</span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <input ref={inputRef} type="file" accept={ALLOWED_TYPES.join(",")} className="hidden" onChange={handleFile} />
          <Button type="button" variant="outline" size="sm" loading={busy} onClick={() => inputRef.current?.click()}>
            <ImagePlus className="h-4 w-4" /> {preview ? "Replace photo" : "Upload photo"}
          </Button>
          {preview && !busy && (
            <Button type="button" variant="ghost" size="sm" onClick={handleRemove}>
              <Trash2 className="h-4 w-4" /> Remove
            </Button>
          )}
          <p className="text-[11px] text-muted-foreground">
            {status === "compressing" ? "Optimizing image…" : status === "uploading" ? "Uploading…" : `JPG, PNG or WEBP, up to ${MAX_SIZE_MB}MB.`}
          </p>
          {error && <p className="text-xs font-medium text-error-600">{error}</p>}
        </div>
      </div>
    </div>
  );
}
