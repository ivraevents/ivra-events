import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Returns a short-lived (60s) signed URL for one document version. Relies
// entirely on the storage RLS policies in supabase/migrations/0020 —
// createSignedUrl fails with 403 unless the caller owns the file or is
// an admin, so there is no separate authorization check needed here.
export async function GET(_request: Request, { params }: { params: Promise<{ versionId: string }> }) {
  const { versionId } = await params;
  const supabase = await createClient();

  const { data: version } = await supabase
    .from("document_versions")
    .select("storage_bucket, storage_path")
    .eq("id", versionId)
    .single();

  if (!version) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data, error } = await supabase.storage
    .from(version.storage_bucket)
    .createSignedUrl(version.storage_path, 60);

  if (error || !data) return NextResponse.json({ error: "Access denied" }, { status: 403 });

  return NextResponse.json({ url: data.signedUrl });
}
