// app/auth/sign-up/page.tsx
// Public registration is disabled; users must obtain credentials from their institute.
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function SignUpPage() {
  return (
    <div className="mx-auto space-y-6 sm:w-sm">
      <div className="flex flex-col space-y-3">
        <div className="space-y-1">
          <h1 className="font-cirka font-bold text-2xl tracking-wide">
            Contact Your Institute
          </h1>
          <p className="text-sm text-muted-foreground">
            Accounts must be by your institute. Please contact your placement officer or coordinator to obtain login credentials.
          </p>
        </div>
      </div>



      <div className="space-y-3">
        <Button asChild className="w-full">
          <Link href="/auth/login">
            Back to Sign In
          </Link>
        </Button>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        If you have already received your login details, you can log in directly. For further assistance, contact your placement department.
      </p>
    </div>
  );
}
