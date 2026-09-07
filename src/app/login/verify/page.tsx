import { Suspense } from "react";
import { VerifyOtpForm } from "./verify-form";

export default function VerifyOtpPage() {
  return (
    <Suspense>
      <VerifyOtpForm />
    </Suspense>
  );
}
