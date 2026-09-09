"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DocumentUpload } from "@/components/booking/document-upload";
import { ShieldCheck, ShieldAlert } from "lucide-react";
import type { DocumentStatus } from "@/types/domain";

interface KycStatusRow {
  aadhaar_front_status: DocumentStatus | null;
  aadhaar_back_status: DocumentStatus | null;
  pan_status: DocumentStatus | null;
}

function needsUpload(status: DocumentStatus | null | undefined) {
  return !status || status === "reupload_requested";
}

// Identity verification, shown once per person rather than once per
// booking/registration. Documents uploaded here are stored user-wide
// (not tied to any one registration — see 0033_kyc_reuse.sql), so once
// Aadhaar front+back are on file — approved OR still awaiting review —
// this renders a short confirmation instead of asking again. Only a
// status of "reupload_requested" (an admin flagged a specific file)
// re-opens the upload for that one document.
export function KycGate({
  onReadyChange,
}: {
  onReadyChange?: (ready: boolean) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [kyc, setKyc] = useState<KycStatusRow | null>(null);
  const [uploadedNow, setUploadedNow] = useState({ aadhaar_front: false, aadhaar_back: false });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.rpc("get_my_kyc_status").single();
      if (cancelled) return;
      setKyc(
        (data as KycStatusRow) ?? {
          aadhaar_front_status: null,
          aadhaar_back_status: null,
          pan_status: null,
        }
      );
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const frontNeeded = !loading && needsUpload(kyc?.aadhaar_front_status) && !uploadedNow.aadhaar_front;
  const backNeeded = !loading && needsUpload(kyc?.aadhaar_back_status) && !uploadedNow.aadhaar_back;
  const ready = !loading && !frontNeeded && !backNeeded;

  useEffect(() => {
    onReadyChange?.(ready);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Checking your ID verification…</p>;
  }

  if (ready) {
    const verified = kyc?.aadhaar_front_status === "approved" && kyc?.aadhaar_back_status === "approved";
    return (
      <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-success-200 bg-success-50 p-3 text-sm text-success-700">
        <ShieldCheck className="h-4 w-4 shrink-0" />
        {verified
          ? "Your Aadhaar is already verified — no need to upload it again."
          : "Your Aadhaar is already on file and awaiting admin verification — no need to upload it again."}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-gold-500/40 bg-gold-500/10 p-3 text-sm text-navy-900">
        <ShieldAlert className="h-4 w-4 shrink-0" />
        We verify your ID once — after admin approval you won&apos;t need to upload it again.
      </div>
      {frontNeeded && (
        <DocumentUpload
          kind="aadhaar_front"
          label="Aadhaar Card — Front"
          required
          onUploaded={() => setUploadedNow((u) => ({ ...u, aadhaar_front: true }))}
        />
      )}
      {backNeeded && (
        <DocumentUpload
          kind="aadhaar_back"
          label="Aadhaar Card — Back"
          required
          onUploaded={() => setUploadedNow((u) => ({ ...u, aadhaar_back: true }))}
        />
      )}
      {needsUpload(kyc?.pan_status) && <DocumentUpload kind="pan" label="PAN Card (optional)" />}
    </div>
  );
}
