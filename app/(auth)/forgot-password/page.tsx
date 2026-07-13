import { Suspense } from "react";
import { ForgotPasswordForm } from "./forgot-password-form";

function ForgotPasswordFallback() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-ili-cinza-50 px-4">
      <div className="h-8 w-8 animate-pulse rounded-lg bg-ili-cinza-200" />
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<ForgotPasswordFallback />}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
