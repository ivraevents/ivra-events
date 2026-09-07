"use client";

import { useTransition } from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { toggleDiscountActive, toggleCouponActive } from "@/lib/actions/admin-misc";
import { cn } from "@/lib/utils";

export function ToggleActiveSwitch({ id, isActive, kind }: { id: string; isActive: boolean; kind: "discount" | "coupon" }) {
  const [pending, startTransition] = useTransition();
  const action = kind === "discount" ? toggleDiscountActive : toggleCouponActive;

  return (
    <SwitchPrimitive.Root
      checked={isActive}
      disabled={pending}
      onCheckedChange={(checked) => startTransition(() => action(id, checked))}
      className={cn(
        "relative h-6 w-11 rounded-full transition-colors",
        isActive ? "bg-success-600" : "bg-cloud-300"
      )}
    >
      <SwitchPrimitive.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-[1.375rem]" />
    </SwitchPrimitive.Root>
  );
}
