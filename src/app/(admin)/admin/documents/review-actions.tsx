"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Textarea, FormField } from "@/components/ui/input";
import { reviewDocumentAction } from "@/lib/actions/admin-misc";
import { Check, RotateCcw } from "lucide-react";
import type { DocumentRejectionReason } from "@/types/domain";

const REASONS: { value: string; label: string }[] = [
  { value: "aadhaar_front_unclear", label: "Aadhaar front unclear" },
  { value: "aadhaar_back_unclear", label: "Aadhaar back unclear" },
  { value: "wrong_document", label: "Wrong document" },
  { value: "document_mismatch", label: "Document does not match" },
  { value: "appears_altered", label: "Appears altered" },
  { value: "other", label: "Other" },
];

export function DocumentReviewActions({ versionId }: { versionId: string }) {
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("other");
  const [note, setNote] = useState("");

  return (
    <div className="flex gap-1.5">
      <Button size="sm" variant="gold" loading={pending} onClick={() => startTransition(async () => { await reviewDocumentAction(versionId, "approve"); })}>
        <Check className="h-3.5 w-3.5" /> Approve
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size="sm" variant="outline"><RotateCcw className="h-3.5 w-3.5" /> Request Re-upload</Button>
        </DialogTrigger>
        <DialogContent title="Request Re-upload">
          <div className="flex flex-col gap-4">
            <FormField label="Reason">
              <select value={reason} onChange={(e) => setReason(e.target.value)} className="h-10 w-full rounded-[var(--radius-md)] border border-border bg-surface px-3 text-sm">
                {REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </FormField>
            <FormField label="Note (optional)"><Textarea value={note} onChange={(e) => setNote(e.target.value)} /></FormField>
            <Button
              loading={pending}
              onClick={() => startTransition(async () => {
                await reviewDocumentAction(versionId, "reupload", reason as DocumentRejectionReason, note);
                setOpen(false);
              })}
            >
              Send Request
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
