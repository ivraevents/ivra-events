import { createClient } from "@/lib/supabase/server";
import { PageHeader, KpiCard } from "@/components/ui/misc";
import { Card, CardContent } from "@/components/ui/card";
import { formatPaise, humanize } from "@/lib/utils";
import {
  Users, Store, ClipboardList, FolderLock, Wallet, Receipt,
  DoorOpen, Lock, CheckCircle2, Handshake, Headphones,
} from "lucide-react";

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const { data: kpis } = await supabase.rpc("admin_kpis");

  const matrix: any[] = kpis?.stall_type_matrix ?? [];

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Admin Dashboard" description="Live snapshot across every event, stall, payment and ticket." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total Users" value={kpis?.total_users ?? 0} icon={Users} />
        <KpiCard label="Vendors" value={kpis?.vendors ?? 0} icon={Store} tone="gold" />
        <KpiCard label="Pending Registrations" value={kpis?.pending_registrations ?? 0} icon={ClipboardList} tone="warning" />
        <KpiCard label="Approved Registrations" value={kpis?.approved_registrations ?? 0} icon={CheckCircle2} tone="success" />
        <KpiCard label="Documents Pending" value={kpis?.documents_pending ?? 0} icon={FolderLock} tone="warning" />
        <KpiCard label="Pending Payments" value={kpis?.pending_payments ?? 0} icon={Wallet} tone="warning" />
        <KpiCard label="Total Revenue" value={formatPaise(kpis?.total_revenue_paise)} icon={Receipt} tone="success" />
        <KpiCard label="Outstanding Balance" value={formatPaise(kpis?.outstanding_balance_paise)} icon={Wallet} tone="error" />
        <KpiCard label="Available Stalls" value={kpis?.stalls_available ?? 0} icon={DoorOpen} tone="success" />
        <KpiCard label="Reserved Stalls" value={kpis?.stalls_reserved ?? 0} icon={Lock} tone="warning" />
        <KpiCard label="Confirmed Stalls" value={kpis?.stalls_confirmed ?? 0} icon={CheckCircle2} tone="navy" />
        <KpiCard label="Pending Negotiations" value={kpis?.pending_negotiations ?? 0} icon={Handshake} tone="gold" />
        <KpiCard label="Open Support Tickets" value={kpis?.open_tickets ?? 0} icon={Headphones} tone="warning" />
      </div>

      <Card>
        <CardContent>
          <h2 className="mb-4 font-display text-lg font-semibold text-navy-900">Stall Type Breakdown</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {matrix.map((m, i) => (
              <div key={i} className="rounded-[var(--radius-md)] border border-border p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {humanize(m.size_type)} {humanize(m.monopoly_type)}
                </p>
                <p className="mt-2 font-display text-xl font-semibold text-navy-900">{m.total} total</p>
                <p className="text-xs text-success-600">{m.available} available</p>
                <p className="text-xs text-warning-600">{m.booked} booked</p>
              </div>
            ))}
            {matrix.length === 0 && <p className="text-sm text-muted-foreground">No stalls configured yet.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
