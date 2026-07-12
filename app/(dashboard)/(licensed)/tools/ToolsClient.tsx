"use client"

import * as React from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Wrench, ChevronRight, FileText } from "lucide-react"
import { IconBrain } from "@tabler/icons-react"
import { useRouter } from "next/navigation"

const toolsList = [
  {
    title: "Resume Analyzer",
    description:
      "Upload your resume for an AI-powered ATS score, section breakdown, skills gap analysis, and personalized improvement tips.",
    href: "/tools/resume_analyzer",
    badge: "AI",
    icon: <IconBrain className="size-5 text-violet-500" />,
    iconBg: "bg-violet-500/10",
  },
  {
    title: "Resume Generator",
    description:
      "Auto-build a professional resume from your filled profile. Pick a template, customise sections, and download as PDF in seconds.",
    href: "/tools/resume_generator",
    badge: "New",
    icon: <FileText className="size-5 text-emerald-500" />,
    iconBg: "bg-emerald-500/10",
  },
]

export function ToolsClient() {
  const router = useRouter()

  return (
    <div className="flex flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
      {/* Page Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold font-cirka tracking-tight text-foreground flex items-center gap-2">
          Career Tools
        </h1>
        <p className="text-sm text-muted-foreground">
          Supercharge your preparation with our AI-powered utilities.
        </p>
      </div>

      {toolsList.length === 0 ? (
        <div className="flex flex-col items-center justify-center border border-dashed border-border/40 rounded-2xl p-12 bg-card text-center mt-6 shadow-sm">
          <Wrench className="h-10 w-10 text-muted-foreground/50 mb-3" />
          <h2 className="text-base font-semibold text-foreground">No Tools Available</h2>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            We are working on bringing you new and improved career preparation utilities. Check back soon!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-300 mt-4">
          {toolsList.map((tool, idx) => (
            <Card
              key={idx}
              className="group flex cursor-pointer flex-col justify-between transition-colors hover:bg-muted/50"
              onClick={() => router.push(tool.href)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${tool.iconBg}`}>
                    {tool.icon}
                  </div>
                  {tool.badge && (
                    <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary">
                      {tool.badge}
                    </Badge>
                  )}
                </div>
                <CardTitle className="group-hover:text-primary transition-colors">
                  {tool.title}
                </CardTitle>
                <CardDescription>
                  {tool.description}
                </CardDescription>
              </CardHeader>
              <div className="flex-1" />
              <CardContent>
                <div className="flex items-center text-sm font-medium text-muted-foreground transition-colors group-hover:text-primary">
                  Open Tool
                  <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
