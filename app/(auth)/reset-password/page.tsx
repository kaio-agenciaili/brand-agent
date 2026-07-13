import { Suspense } from "react";
import { ResetPasswordForm } from "./reset-password-form";

function ResetPasswordFallback() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-ili-cinza-50 px-4">
      <div className="h-8 w-8 animate-pulse rounded-lg bg-ili-cinza-200" />
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordFallback />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
