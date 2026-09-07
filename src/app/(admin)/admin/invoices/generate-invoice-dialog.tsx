"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, FormField } from "@/components/ui/input";
import { generateInvoiceAction } from "@/lib/actions/admin-misc";
import { FilePlus2 } from "lucide-react";

export function GenerateInvoiceDialog({
  userId, paymentId, allocationId, defaultAmount, defaultDescription,
}: { userId: string; paymentId?: string; allocationId?: string; defaultAmount: number; defaultDescription: string }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(defaultAmount));
  const [description, setDescription] = useState(defaultDescription);
  const [invoiceType, setInvoiceType] = useState<"gst" | "non_gst">("non_gst");
  const [taxRate, setTaxRate] = useState("0");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit() {
    setLoading(true);
    await generateInvoiceAction({
      userId, paymentId, allocationId,
      amount: Number(amount), description, invoiceType, taxRate: Number(taxRate),
    });
    setLoading(false);
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><FilePlus2 className="h-3.5 w-3.5" /> Generate Invoice</Button>
      </DialogTrigger>
      <DialogContent title="Generate Invoice">
        <div className="flex flex-col gap-4">
          <FormField label="Description"><Input value={description} onChange={(e) => setDescription(e.target.value)} /></FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Amount (₹)"><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></FormField>
            <FormField label="Tax rate (%)"><Input type="number" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} /></FormField>
          </div>
          <FormField label="Invoice type">
            <select value={invoiceType} onChange={(e) => setInvoiceType(e.target.value as "gst" | "non_gst")} className="h-10 w-full rounded-[var(--radius-md)] border border-border bg-surface px-3 text-sm">
              <option value="non_gst">Non-GST</option><option value="gst">GST</option>
            </select>
          </FormField>
          <Button loading={loading} onClick={submit}>Generate</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
