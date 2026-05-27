// app/auth/sign-up-success/page.tsx
//
// Fallback shown when a user signs up but OTP confirmation was somehow
// bypassed (e.g. the user navigated away before entering the code).
// The primary flow verifies inline via OTP on /auth/sign-up.
import { MailIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function SignUpSuccessPage() {
  return (
    <div className="mx-auto space-y-4 sm:w-sm text-center">
      <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-full bg-primary/10">
        <MailIcon className="h-7 w-7 text-primary" />
      </div>
      <div className="space-y-1">
        <h1 className="font-bold text-2xl tracking-wide">Check Your Email</h1>
        <p className="text-base text-muted-foreground">
          We sent a confirmation code to your email address. Enter the code on
          the sign-up page to activate your account.
        </p>
        <p className="text-sm text-muted-foreground">
          The code works from any device or browser.
        </p>
      </div>
      <Button asChild className="w-full">
        <Link href="/auth/sign-up">Enter Code</Link>
      </Button>
      <Button asChild variant="outline" className="w-full">
        <Link href="/auth/login">Go to Sign In</Link>
      </Button>
    </div>
  );
}