"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime, cn } from "@/lib/utils";

interface NotificationRow {
  id: string;
  title: string;
  body: string | null;
  link_path: string | null;
  is_read: boolean;
  created_at: string;
}

export function NotificationBell({ dark = false }: { dark?: boolean }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    async function load() {
      const { data } = await supabase
        .from("notifications")
        .select("id, title, body, link_path, is_read, created_at")
        .order("created_at", { ascending: false })
        .limit(8);
      if (!active || !data) return;
      setItems(data as NotificationRow[]);
      setUnread(data.filter((n) => !n.is_read).length);
    }
    load();

    const channel = supabase
      .channel("notifications-bell")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, load)
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  async function markAllRead() {
    const supabase = createClient();
    await supabase.from("notifications").update({ is_read: true }).eq("is_read", false);
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnread(0);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "relative flex items-center justify-center rounded-full transition-all active:scale-95",
          dark
            ? "h-10 w-10 border border-white/10 bg-white/[0.06] text-cloud-200 shadow-[0_2px_10px_rgba(0,0,0,0.3)] backdrop-blur-sm hover:border-gold-400/40 hover:bg-white/10 hover:text-white"
            : "p-2 text-charcoal-500 hover:bg-surface-muted"
        )}
        aria-label="Notifications"
      >
        <Bell className="h-[18px] w-[18px]" />
        {unread > 0 && (
          <span
            className={cn(
              "absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-br from-[#ff6b6b] to-[#e63946] text-[9px] font-bold text-white",
              dark && "ring-2 ring-navy-950"
            )}
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-80 rounded-[var(--radius-md)] border border-border bg-surface shadow-[var(--shadow-elevated)]">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <p className="text-sm font-semibold text-navy-900">Notifications</p>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs font-medium text-royal-600">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 && (
              <p className="p-4 text-center text-xs text-muted-foreground">You&apos;re all caught up.</p>
            )}
            {items.map((n) => (
              <Link
                key={n.id}
                href={n.link_path ?? "#"}
                onClick={() => setOpen(false)}
                className={`block border-b border-border px-3 py-2.5 text-sm hover:bg-surface-muted last:border-0 ${
                  !n.is_read ? "bg-info-100/40" : ""
                }`}
              >
                <p className="font-medium text-navy-900">{n.title}</p>
                {n.body && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</p>}
                <p className="mt-1 text-[10px] text-charcoal-300">{formatDateTime(n.created_at)}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
