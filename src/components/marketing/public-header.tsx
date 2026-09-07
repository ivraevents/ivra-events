import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-navy-800 bg-navy-950/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo dark size={32} />
        <nav className="flex items-center gap-2 sm:gap-4">
          <Link
            href="/#events"
            className="hidden text-sm font-medium text-cloud-300 hover:text-white sm:block"
          >
            Upcoming Events
          </Link>
          <Button asChild size="sm" variant="gold">
            <Link href="/login">Sign In</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
