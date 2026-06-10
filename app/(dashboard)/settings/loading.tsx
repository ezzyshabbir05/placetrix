// app/settings/loading.tsx

import { Skeleton } from "@/components/ui/skeleton"

// ─── Primitives ───────────────────────────────────────────────────────────────

/** label + input */
function Field({ labelW = "w-24" }: { labelW?: string }) {
  return (
    <div className="space-y-2">
      <Skeleton className={`h-4 ${labelW}`} />
      <Skeleton className="h-9 w-full rounded-md" />
    </div>
  )
}

/** horizontal rule */
function Hr() {
  return <Skeleton className="h-px w-full" />
}

/** card wrapper that matches shadcn <Card> */
function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card">
      {children}
    </div>
  )
}

/** card header: title + description */
function CardHead({ titleW = "w-36", descW = "w-56" }: { titleW?: string; descW?: string }) {
  return (
    <div className="flex flex-col gap-y-1.5 p-6">
      <Skeleton className={`h-5 ${titleW}`} />
      <Skeleton className={`h-4 ${descW}`} />
    </div>
  )
}

/** card body */
function CardBody({ children }: { children: React.ReactNode }) {
  return <div className="p-6 pt-0 space-y-4">{children}</div>
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

export default function SettingsLoading() {
  return (
    <div className="flex flex-col gap-6 px-4 py-8 md:px-8">

      {/* ── Page header — matches both clients exactly ─────────────────────── */}
      <div className="flex flex-col gap-1.5">
        <h1 className="text-3xl font-bold font-cirka tracking-tight text-foreground">Settings</h1>
        <Skeleton className="h-4 w-64" />
      </div>

      {/* ── Tab bar ────────────────────────────────────────────────────────── */}
      <div className="overflow-x-auto">
        <div className="inline-flex h-9 items-center gap-0.5 rounded-lg bg-muted p-1">
          {/*
            Candidate tabs: Account | Security | Billing | Notifications | Login History | Privacy
            Institute tabs: Institution | Security | Notifications | Login History | Privacy
            Use natural-width pills sized to approximate real label text at text-xs px-3.
          */}
          <Skeleton className="h-7 w-[66px]  rounded-md shrink-0" />
          <Skeleton className="h-7 w-[60px]  rounded-md shrink-0" />
          <Skeleton className="h-7 w-[52px]  rounded-md shrink-0" />
          <Skeleton className="h-7 w-[96px]  rounded-md shrink-0" />
          <Skeleton className="h-7 w-[90px]  rounded-md shrink-0" />
          <Skeleton className="h-7 w-[56px]  rounded-md shrink-0" />
        </div>
      </div>

      {/* ── Tab content ────────────────────────────────────────────────────── */}
      <div className="mt-4 space-y-6">

        {/* ── 1. Account Settings (username) ─── */}
        <Card>
          <CardHead titleW="w-36" descW="w-72" />
          <CardBody>
            <div className="max-w-sm space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-9 w-full rounded-md" />
              <Skeleton className="h-3.5 w-64" />
            </div>
          </CardBody>
        </Card>

        {/* ── 2. Profile Photo / College Logo ─── */}
        <Card>
          <CardHead titleW="w-28" descW="w-52" />
          <CardBody>
            <div className="flex items-center gap-4">
              {/* avatar circle */}
              <Skeleton className="size-20 rounded-full shrink-0" />
              <div className="space-y-2">
                <Skeleton className="h-8 w-28 rounded-md" />
                <Skeleton className="h-3.5 w-44" />
              </div>
            </div>
          </CardBody>
        </Card>

        {/* ── 3. Personal / Basic Information ─── */}
        <Card>
          <CardHead titleW="w-40" descW="w-56" />
          <CardBody>
            {/* row 1 — 2-col (Institute) / 3-col (Candidate: first/mid/last) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field />
              <Field />
              <Field />
            </div>

            {/* row 2 — 3-col (gender / phone / dob  OR  established / affiliation) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field />
              <Field />
              <Field />
            </div>

            <Hr />

            {/* address textarea */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-20 w-full rounded-md" />
            </div>

            {/* row 3 — city / state / pincode */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field />
              <Field />
              <Field />
            </div>

            {/* single field (country / aadhaar) */}
            <Field labelW="w-20" />
          </CardBody>
        </Card>

        {/* ── 4. Contact / Education Details ─── */}
        <Card>
          <CardHead titleW="w-44" descW="w-60" />
          <CardBody>
            {/* 2-col row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field />
              <Field />
            </div>

            {/* single */}
            <Field labelW="w-28" />

            <Hr />

            {/* 2-col row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field />
              <Field />
            </div>

            {/* checkbox-like toggles */}
            <div className="flex gap-6">
              <Skeleton className="h-4 w-14 rounded" />
              <Skeleton className="h-4 w-20 rounded" />
            </div>

            <Hr />

            {/* PRN / single wide */}
            <Field labelW="w-32" />

            {/* SGPA grid */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-52" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Field key={i} />
                ))}
              </div>
            </div>
          </CardBody>
        </Card>

        {/* ── 5. Admin Contacts / Professional Info ─── */}
        <Card>
          <CardHead titleW="w-48" descW="w-52" />
          <CardBody>
            {/* section sub-label */}
            <Skeleton className="h-4 w-28" />

            {/* 3-col row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field />
              <Field />
              <Field />
            </div>

            <Hr />

            {/* tag input / skills */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-9 w-full rounded-md" />
            </div>

            <Hr />

            {/* 2-col links */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field />
              <Field />
            </div>
          </CardBody>
        </Card>

        {/* ── 6. Courses / Social Links ─── */}
        <Card>
          <CardHead titleW="w-36" descW="w-64" />
          <CardBody>
            <div className="space-y-3">
              <Skeleton className="h-9 w-full rounded-md" />
              <Skeleton className="h-9 w-full rounded-md" />
              <Skeleton className="h-8 w-24 rounded-md" />
            </div>
          </CardBody>
        </Card>

      </div>
    </div>
  )
}