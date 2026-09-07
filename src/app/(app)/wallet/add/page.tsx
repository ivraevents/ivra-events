import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/misc";
import { AddFundsWizard } from "./add-funds-wizard";

interface UpiDetails {
  vpa?: string;
  payee_name?: string;
}

export default async function AddFundsPage() {
  const supabase = await createClient();
  const { data: publicSettings } = await supabase.rpc("get_public_settings");
  const upiDetails = (publicSettings as { upi_details?: UpiDetails } | null)?.upi_details ?? null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Add Funds" description="Select an amount, pay via QR, then upload your receipt for verification." />
      <div className="max-w-md">
        <AddFundsWizard upiDetails={upiDetails} />
      </div>
    </div>
  );
}
