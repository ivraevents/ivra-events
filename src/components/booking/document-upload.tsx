"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/badge";
import { UploadCloud, CheckCircle2 } from "lucide-react";
import type { DocumentKind } from "@/types/domain";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_SIZE_MB = 5;

export function DocumentUpload({
  kind,
  label,
  registrationId,
  required,
  onUploaded,
}: {
  kind: DocumentKind;
  label: string;
  registrationId: string;
  required?: boolean;
  onUploaded?: () => void;
}) {
  const [status, setStatus] = useState<"idle" | "uploading" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Only JPG, PNG or PDF files are allowed.");
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`File must be under ${MAX_SIZE_MB}MB.`);
      return;
    }

    setStatus("uploading");
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Not signed in.");
      setStatus("idle");
      return;
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${user.id}/${kind}/${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage.from("private-documents").upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
    if (uploadError) {
      setError(uploadError.message);
      setStatus("idle");
      return;
    }

    const { error: rpcError } = await supabase.rpc("upload_document_version", {
      p_kind: kind,
      p_registration_id: registrationId,
      p_storage_path: path,
      p_original_filename: file.name,
      p_mime_type: file.type,
      p_file_size_bytes: file.size,
    });
    if (rpcError) {
      setError(rpcError.message);
      setStatus("idle");
      return;
    }

    setFileName(file.name);
    setStatus("done");
    onUploaded?.();
  }

  return (
    <div className="flex items-center justify-between gap-4 rounded-[var(--radius-md)] border border-border p-4">
      <div>
        <p className="text-sm font-medium text-navy-900">
          {label} {required && <span className="text-error-600">*</span>}
        </p>
        {fileName ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{fileName}</p>
        ) : (
          <p className="mt-0.5 text-xs text-muted-foreground">JPG, PNG or PDF, up to {MAX_SIZE_MB}MB</p>
        )}
        {error && <p className="mt-1 text-xs font-medium text-error-600">{error}</p>}
      </div>
      <div className="flex items-center gap-2">
        {status === "done" ? (
          <StatusPill status="pending" />
        ) : null}
        <input ref={inputRef} type="file" accept={ALLOWED_TYPES.join(",")} className="hidden" onChange={handleFile} />
        <Button
          type="button"
          variant="outline"
          size="sm"
          loading={status === "uploading"}
          onClick={() => inputRef.current?.click()}
        >
          {status === "done" ? <CheckCircle2 className="h-4 w-4 text-success-600" /> : <UploadCloud className="h-4 w-4" />}
          {status === "done" ? "Replace" : "Upload"}
        </Button>
      </div>
    </div>
  );
}
