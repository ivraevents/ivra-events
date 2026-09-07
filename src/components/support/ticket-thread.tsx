"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { formatDateTime, cn } from "@/lib/utils";
import { Send } from "lucide-react";

interface Message {
  id: string;
  sender_id: string;
  is_staff: boolean;
  message: string;
  created_at: string;
}

export function TicketThread({ ticketId, initialMessages, currentUserId, isStaff = false }: { ticketId: string; initialMessages: Message[]; currentUserId: string; isStaff?: boolean }) {
  const [messages, setMessages] = useState(initialMessages);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`ticket-${ticketId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "support_messages", filter: `ticket_id=eq.${ticketId}` },
        (payload) => setMessages((prev) => [...prev, payload.new as Message])
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticketId]);

  async function send() {
    if (!text.trim()) return;
    setSending(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("support_messages")
      .insert({ ticket_id: ticketId, sender_id: currentUserId, is_staff: isStaff, message: text })
      .select()
      .single();
    setSending(false);
    if (!error && data) {
      setMessages((prev) => (prev.some((m) => m.id === data.id) ? prev : [...prev, data as Message]));
      setText("");
    }
  }

  return (
    <div className="flex h-[32rem] flex-col rounded-[var(--radius-lg)] border border-border bg-surface">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((m) => {
          const isSelf = m.sender_id === currentUserId;
          return (
          <div key={m.id} className={cn("flex", isSelf ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[80%] rounded-[var(--radius-md)] px-3 py-2 text-sm",
                isSelf ? "bg-navy-900 text-white" : "bg-surface-muted text-charcoal-700"
              )}
            >
              <p>{m.message}</p>
              <p className={cn("mt-1 text-[10px]", isSelf ? "text-cloud-300" : "text-charcoal-400")}>
                {isSelf ? "You" : m.is_staff ? "Support" : "Vendor"} · {formatDateTime(m.created_at)}
              </p>
            </div>
          </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <div className="flex items-end gap-2 border-t border-border p-3">
        <Textarea
          rows={1}
          placeholder="Type a message…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          className="min-h-10"
        />
        <Button size="icon" onClick={send} loading={sending}><Send className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}
