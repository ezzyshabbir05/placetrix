import { Metadata } from "next"
import { getChangelogs, ChangelogCategoryType } from "@/lib/changelog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty"
import { BookOpen } from "lucide-react"

export const metadata: Metadata = {
  title: "Changelog",
  description: "Explore the latest features, improvements, and fixes across PlaceTrix.",
}

export const revalidate = 3600

import { ChangelogDate } from "./changelog-date"

function CategoryBadge({ type }: { type: ChangelogCategoryType }) {
  switch (type) {
    case "added":
      return <Badge variant="default" className="capitalize">Added</Badge>
    case "improved":
      return <Badge variant="secondary" className="capitalize">Improved</Badge>
    case "fixed":
      return <Badge variant="outline" className="capitalize">Fixed</Badge>
    case "security":
      return <Badge variant="destructive" className="capitalize">Security</Badge>
    default:
      return <Badge variant="outline" className="capitalize">{type}</Badge>
  }
}

export default async function ChangelogPage() {
  const changelogs = await getChangelogs()

  return (
    <div className="flex flex-col gap-6 px-4 py-8 md:px-8">
      {/* Page Header */}
      <div className="flex flex-col gap-1.5">
        <h1 className="text-3xl font-bold font-cirka tracking-tight text-foreground">Changelog</h1>
        <p className="text-sm text-muted-foreground">
          Explore the latest features, improvements, and fixes
        </p>
      </div>

      {/* Changelog Entries */}
      {changelogs.length === 0 ? (
        <Empty className="border border-dashed border-border/60 rounded-xl bg-card/50 p-12">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BookOpen className="h-5 w-5 text-muted-foreground/60" />
            </EmptyMedia>
            <EmptyTitle>No changelog entries</EmptyTitle>
            <EmptyDescription>Check back later for new updates</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="flex flex-col gap-8">
          {changelogs.map((release, releaseIdx) => (
            <div key={release.version} className="flex flex-col gap-4">
              {releaseIdx > 0 && <Separator className="my-2" />}

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-base">v{release.version}</span>
                  <ChangelogDate date={release.date} createdAt={release.created_at} />
                </div>
                <h3 className="text-base font-medium text-foreground">{release.title}</h3>
              </div>

              <div className="flex flex-col gap-4">
                {release.categories.map((cat, catIdx) => (
                  <div key={catIdx} className="flex flex-col gap-2">
                    <div>
                      <CategoryBadge type={cat.type} />
                    </div>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1.5">
                      {cat.items.map((item, itemIdx) => (
                        <li key={itemIdx} className="leading-relaxed">{item}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
