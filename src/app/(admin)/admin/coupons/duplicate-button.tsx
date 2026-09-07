"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { duplicateCouponAction } from "@/lib/actions/admin-misc";
import { Copy } from "lucide-react";

export function DuplicateCouponButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button size="sm" variant="ghost" loading={pending} onClick={() => startTransition(async () => { await duplicateCouponAction(id); })}>
      <Copy className="h-3.5 w-3.5" />
    </Button>
  );
}
