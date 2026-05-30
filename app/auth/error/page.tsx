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
    <div className="mx-auto space-y-4 sm:w-sm">
      <div className="flex flex-col space-y-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircleIcon className="h-6 w-6 text-destructive" />
        </div>
        <div className="space-y-1">
          <h1 className="font-cirka font-bold text-2xl tracking-wide">
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
      </div>
      <Button asChild variant="outline" className="w-full">
        <Link href="/auth/login">Back to Sign In</Link>
      </Button>
    </div>
  );
}