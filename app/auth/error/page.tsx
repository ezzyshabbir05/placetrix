// app/auth/error/page.tsx
import { AlertCircleIcon } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";

async function ErrorMessage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  return (
    <p className="text-sm text-muted-foreground">
      {params?.error ?? "An unspecified error occurred."}
    </p>
  );
}

export default function ErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <div className="mx-auto space-y-4 sm:w-sm text-center">
      <AlertCircleIcon className="mx-auto h-12 w-12 text-destructive" />
      <div className="space-y-1">
        <h1 className="font-bold text-2xl tracking-wide">
          Something went wrong
        </h1>
        <Suspense
          fallback={
            <p className="text-sm text-muted-foreground">Loading…</p>
          }
        >
          <ErrorMessage searchParams={searchParams} />
        </Suspense>
      </div>
      <Button asChild variant="outline" className="w-full">
        <Link href="/auth/login">Back to Sign In</Link>
      </Button>
    </div>
  );
}