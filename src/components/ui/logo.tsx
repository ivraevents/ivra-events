import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  size = 36,
  withWordmark = true,
  dark = false,
}: {
  className?: string;
  size?: number;
  withWordmark?: boolean;
  dark?: boolean;
}) {
  return (
    <Link href="/" className={cn("flex items-center gap-2.5 shrink-0", className)}>
      <Image
        src="/brand/logo-mark.png"
        alt="IVRA Events"
        width={size}
        height={size}
        className="rounded-md"
        priority
      />
      {withWordmark && (
        <span
          className={cn(
            "font-display text-lg font-semibold tracking-wide",
            dark ? "text-white" : "text-navy-900"
          )}
        >
          IVRA <span className="text-gold-500">EVENTS</span>
        </span>
      )}
    </Link>
  );
}
