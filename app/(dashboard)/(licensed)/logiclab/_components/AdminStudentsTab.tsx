"use client"

import React, { useState, useMemo } from "react"
import {
  Users,
  AlertTriangle,
  Trophy,
  Search,
  X,
  ChevronDown,
  Flame,
  TrendingUp,
  Clock,
  Zap,
  Medal,
  Star,
  Brain,
  Target,
  ArrowUpRight,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupButton } from "@/components/ui/input-group"
import { TablePaginationBar } from "./TablePaginationBar"
import { cn } from "@/lib/utils"

export interface StudentAdminRow {
  user_id: string
  student_name: string
  student_email: string
  solved_count: number
  easy_solved: number
  medium_solved: number
  hard_solved: number
  total_points: number
  current_streak: number
  longest_streak: number
  last_solve_date: string | null
  attempt_count: number
  potd_streak: number
}

interface AdminStudentsTabProps {
  students: StudentAdminRow[]
  totalProblems: number
}

const TOTAL_PROBLEMS_EASY = 48
const TOTAL_PROBLEMS_MEDIUM = 61
const TOTAL_PROBLEMS_HARD = 16

function getDaysAgo(dateStr: string | null): number {
  if (!dateStr) return 999
  const d = new Date(dateStr)
  const now = new Date()
  return Math.floor((now.getTime() - d.getTime()) / 86_400_000)
}

function getPlacementScore(s: StudentAdminRow, totalProblems: number): number {
  const hardPct = totalProblems > 0 ? (s.hard_solved / TOTAL_PROBLEMS_HARD) * 100 : 0
  const medPct = totalProblems > 0 ? (s.medium_solved / TOTAL_PROBLEMS_MEDIUM) * 100 : 0
  const solved = s.solved_count
  const breadth = totalProblems > 0 ? Math.min((solved / totalProblems) * 100, 100) : 0
  const streakScore = Math.min(s.longest_streak * 2, 100)
  const potdScore = Math.min(s.potd_streak * 5, 100)

  return Math.min(
    Math.round(
      hardPct * 0.4 +
        medPct * 0.25 +
        breadth * 0.2 +
        streakScore * 0.1 +
        potdScore * 0.05
    ),
    100
  )
}

function getRiskReasons(s: StudentAdminRow): string[] {
  const reasons: string[] = []
  const daysAgo = getDaysAgo(s.last_solve_date)
  if (daysAgo >= 7) reasons.push("Inactive 7d+")
  if (s.solved_count < 5) reasons.push("Low solves")
  if (s.current_streak === 0) reasons.push("Streak broken")
  if (s.hard_solved === 0 && s.solved_count >= 10) reasons.push("Avoiding Hard")
  return reasons
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
}

function PlacementScoreBadge({ score }: { score: number }) {
  const color =
    score >= 70
      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
      : score >= 40
      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
      : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
  return (
    <span
      className={cn(
        "inline-flex items-center text-xs font-mono font-bold px-2 py-0.5 rounded-full border",
        color
      )}
    >
      {score}
    </span>
  )
}

function StudentDetailSheet({
  student,
  open,
  onClose,
  totalProblems,
}: {
  student: StudentAdminRow | null
  open: boolean
  onClose: () => void
  totalProblems: number
}) {
  if (!student) return null
  const placementScore = getPlacementScore(student, totalProblems)
  const daysAgo = getDaysAgo(student.last_solve_date)
  const topics = [
    { label: "Easy Problems", solved: student.easy_solved, total: TOTAL_PROBLEMS_EASY, color: "bg-emerald-500" },
    { label: "Medium Problems", solved: student.medium_solved, total: TOTAL_PROBLEMS_MEDIUM, color: "bg-amber-500" },
    { label: "Hard Problems", solved: student.hard_solved, total: TOTAL_PROBLEMS_HARD, color: "bg-rose-500" },
  ]

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto flex flex-col gap-0 p-0">
        <SheetHeader className="p-6 pb-4 border-b bg-muted/30">
          <div className="flex items-start gap-4">
            <Avatar className="size-12 shrink-0">
              <AvatarFallback className="text-base font-bold bg-primary/10 text-primary">
                {getInitials(student.student_name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-base font-bold truncate">{student.student_name}</SheetTitle>
              <SheetDescription className="text-xs truncate">{student.student_email}</SheetDescription>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <PlacementScoreBadge score={placementScore} />
                {student.current_streak > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-orange-500">
                    <Flame className="size-3" /> {student.current_streak}d streak
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  {daysAgo === 0
                    ? "Active today"
                    : daysAgo === 999
                    ? "Never active"
                    : `Last active ${daysAgo}d ago`}
                </span>
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="p-6 flex flex-col gap-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Total Solved", value: student.solved_count, icon: Brain, color: "text-indigo-500" },
              { label: "Total Points", value: student.total_points, icon: Star, color: "text-amber-500" },
              { label: "Current Streak", value: `${student.current_streak}d`, icon: Flame, color: "text-orange-500" },
              { label: "Longest Streak", value: `${student.longest_streak}d`, icon: Zap, color: "text-cyan-500" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div
                key={label}
                className="flex flex-col gap-1 p-3 rounded-lg bg-muted/40 border border-border/40"
              >
                <div className={cn("flex items-center gap-1.5 text-xs text-muted-foreground", color)}>
                  <Icon className="size-3" />
                  {label}
                </div>
                <div className="text-xl font-bold font-mono text-foreground">{value}</div>
              </div>
            ))}
          </div>

          <Separator />

          {/* Placement Readiness */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Target className="size-4 text-primary" />
                Placement Readiness
              </h3>
              <PlacementScoreBadge score={placementScore} />
            </div>
            <Progress
              value={placementScore}
              className={cn(
                "h-2.5",
                placementScore >= 70
                  ? "[&>div]:bg-emerald-500"
                  : placementScore >= 40
                  ? "[&>div]:bg-amber-500"
                  : "[&>div]:bg-rose-500"
              )}
            />
            <div className="space-y-2">
              {topics.map(({ label, solved, total, color }) => (
                <div key={label} className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{label}</span>
                    <span className="font-mono font-semibold text-foreground">
                      {solved}
                      <span className="text-muted-foreground font-normal">/{total}</span>
                    </span>
                  </div>
                  <Progress
                    value={total > 0 ? (solved / total) * 100 : 0}
                    className={cn("h-1.5 bg-muted", `[&>div]:${color}`)}
                  />
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Risk Flags */}
          {getRiskReasons(student).length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <AlertTriangle className="size-4 text-rose-500" />
                Risk Flags
              </h3>
              <div className="flex flex-wrap gap-2">
                {getRiskReasons(student).map((r) => (
                  <Badge
                    key={r}
                    variant="outline"
                    className="text-xs border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/5"
                  >
                    {r}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

export function AdminStudentsTab({ students, totalProblems }: AdminStudentsTabProps) {
  const [search, setSearch] = useState("")
  const [sortBy, setSortBy] = useState<"points" | "solved" | "streak" | "risk">("points")
  const [activeSubTab, setActiveSubTab] = useState("all")
  const [selectedStudent, setSelectedStudent] = useState<StudentAdminRow | null>(null)

  const atRisk = useMemo(
    () =>
      students.filter((s) => {
        const daysAgo = getDaysAgo(s.last_solve_date)
        return daysAgo >= 7 || s.solved_count < 5 || s.current_streak === 0
      }),
    [students]
  )

  const topPerformers = useMemo(
    () =>
      [...students]
        .sort((a, b) => getPlacementScore(b, totalProblems) - getPlacementScore(a, totalProblems))
        .slice(0, 10),
    [students, totalProblems]
  )

  const filtered = useMemo(() => {
    let base = activeSubTab === "at-risk" ? atRisk : activeSubTab === "top" ? topPerformers : students
    if (search) {
      const q = search.toLowerCase()
      base = base.filter(
        (s) =>
          s.student_name.toLowerCase().includes(q) ||
          s.student_email.toLowerCase().includes(q)
      )
    }
    return [...base].sort((a, b) => {
      if (sortBy === "points") return b.total_points - a.total_points
      if (sortBy === "solved") return b.solved_count - a.solved_count
      if (sortBy === "streak") return b.current_streak - a.current_streak
      // risk = most days inactive first
      return getDaysAgo(b.last_solve_date) - getDaysAgo(a.last_solve_date)
    })
  }, [students, atRisk, topPerformers, activeSubTab, search, sortBy])

  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)

  // Reset page when filter or search changes
  React.useEffect(() => {
    setPage(0)
  }, [search, sortBy, activeSubTab])

  const paginatedStudents = useMemo(() => {
    const start = page * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, page, pageSize])

  const avgScore = useMemo(
    () =>
      students.length > 0
        ? Math.round(students.reduce((sum, s) => sum + getPlacementScore(s, totalProblems), 0) / students.length)
        : 0,
    [students, totalProblems]
  )

  const onStreakCount = students.filter((s) => s.current_streak > 0).length

  return (
    <div className="space-y-5 animate-in fade-in-50 duration-200">
      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Students */}
        <Card className="p-4 bg-background/40 backdrop-blur-sm rounded-lg border flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Total Students</span>
            <span className="text-[10px] font-mono text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">Cohort</span>
          </div>
          <div className="text-2xl font-bold font-mono text-foreground mt-2">{students.length}</div>
          <div className="mt-2 text-[11px] text-muted-foreground flex items-center justify-between">
            <span>Active in lab</span>
            <span className="font-mono font-semibold text-foreground">{students.filter(s => s.solved_count > 0).length} students</span>
          </div>
          <div className="w-full bg-muted/50 rounded-full h-1 mt-1.5 overflow-hidden">
            <div
              className="bg-primary h-full rounded-full transition-all"
              style={{ width: `${students.length > 0 ? (students.filter(s => s.solved_count > 0).length / students.length) * 100 : 0}%` }}
            />
          </div>
        </Card>

        {/* Card 2: At Risk */}
        <Card className="p-4 bg-background/40 backdrop-blur-sm rounded-lg border flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">At Risk</span>
            <span className="text-[10px] font-mono text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded">Action Needed</span>
          </div>
          <div className="text-2xl font-bold font-mono text-rose-500 mt-2">{atRisk.length}</div>
          <div className="mt-2 text-[11px] text-muted-foreground flex items-center justify-between">
            <span>Inactive &gt; 7 days</span>
            <span className="font-mono font-semibold text-rose-500">{atRisk.length} students</span>
          </div>
          <div className="w-full bg-muted/50 rounded-full h-1 mt-1.5 overflow-hidden">
            <div
              className="bg-rose-500 h-full rounded-full transition-all"
              style={{ width: `${students.length > 0 ? (atRisk.length / students.length) * 100 : 0}%` }}
            />
          </div>
        </Card>

        {/* Card 3: On Streak */}
        <Card className="p-4 bg-background/40 backdrop-blur-sm rounded-lg border flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Daily Streak</span>
            <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">Active Solvers</span>
          </div>
          <div className="text-2xl font-bold font-mono text-amber-500 mt-2">{onStreakCount}</div>
          <div className="mt-2 text-[11px] text-muted-foreground flex items-center justify-between">
            <span>Daily consistency</span>
            <span className="font-mono font-semibold text-foreground">
              {students.length > 0 ? Math.round((onStreakCount / students.length) * 100) : 0}% of cohort
            </span>
          </div>
          <div className="w-full bg-muted/50 rounded-full h-1 mt-1.5 overflow-hidden">
            <div
              className="bg-amber-500 h-full rounded-full transition-all"
              style={{ width: `${students.length > 0 ? (onStreakCount / students.length) * 100 : 0}%` }}
            />
          </div>
        </Card>

        {/* Card 4: Avg Readiness */}
        <Card className="p-4 bg-background/40 backdrop-blur-sm rounded-lg border flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Avg. Readiness</span>
            <span className="text-[10px] font-mono text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">Target: 70%+</span>
          </div>
          <div className="text-2xl font-bold font-mono text-foreground mt-2">{avgScore}%</div>
          <div className="mt-2 text-[11px] text-muted-foreground flex items-center justify-between">
            <span>Interview ready (score &ge; 70)</span>
            <span className="font-mono font-semibold text-emerald-500">
              {students.filter(s => getPlacementScore(s, totalProblems) >= 70).length} students
            </span>
          </div>
          <div className="w-full bg-muted/50 rounded-full h-1 mt-1.5 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all"
              style={{ width: `${Math.min(avgScore, 100)}%` }}
            />
          </div>
        </Card>
      </div>

      {/* Tabs + Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
          <TabsList className="h-8 bg-muted/50 p-1 rounded-xl gap-1">
            {[
              { value: "all", label: `All (${students.length})` },
              { value: "at-risk", label: `At Risk (${atRisk.length})` },
              { value: "top", label: "Top Performers" },
            ].map(({ value, label }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="rounded-lg px-3.5 h-6 text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          <InputGroup className="h-8 max-w-52 bg-background rounded-lg">
            <InputGroupAddon align="inline-start">
              <Search className="size-3.5 text-muted-foreground/60" />
            </InputGroupAddon>
            <InputGroupInput
              placeholder="Search students..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-full text-xs"
            />
            {search && (
              <InputGroupAddon align="inline-end">
                <InputGroupButton onClick={() => setSearch("")} variant="ghost" size="icon-xs" className="text-muted-foreground">
                  <X />
                </InputGroupButton>
              </InputGroupAddon>
            )}
          </InputGroup>

          <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
            <SelectTrigger className="h-8 w-32 text-xs font-semibold rounded-lg border-muted-foreground/20 bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="points" className="text-xs">By Points</SelectItem>
              <SelectItem value="solved" className="text-xs">By Solved</SelectItem>
              <SelectItem value="streak" className="text-xs">By Streak</SelectItem>
              <SelectItem value="risk" className="text-xs">By Inactivity</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Students Table */}
      <Card className="py-0 bg-background/40 backdrop-blur-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="min-w-[800px] text-xs">
            <TableHeader>
              <TableRow className="bg-muted/40 border-b border-border/50 text-xs font-bold text-muted-foreground uppercase tracking-wider select-none hover:bg-muted/40">
                <TableHead className="px-4 py-3 w-8 text-center">#</TableHead>
                <TableHead className="px-4 py-3">Student</TableHead>
                <TableHead className="px-4 py-3 text-center">Solved</TableHead>
                <TableHead className="px-4 py-3 text-center">E / M / H</TableHead>
                <TableHead className="px-4 py-3 text-center">Points</TableHead>
                <TableHead className="px-4 py-3 text-center">Streak</TableHead>
                <TableHead className="px-4 py-3 text-center">Last Active</TableHead>
                <TableHead className="px-4 py-3 text-center">Readiness</TableHead>
                <TableHead className="px-4 py-3 text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-20 text-muted-foreground/50">
                    <Users className="size-8 mx-auto mb-2 stroke-[1.2]" />
                    <p className="text-xs font-semibold uppercase tracking-widest">No students found</p>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedStudents.map((s, idx) => {
                  const score = getPlacementScore(s, totalProblems)
                  const daysAgo = getDaysAgo(s.last_solve_date)
                  const risks = getRiskReasons(s)
                  const isEven = idx % 2 === 0
                  return (
                    <TableRow
                      key={s.user_id}
                      onClick={() => setSelectedStudent(s)}
                      className={cn(
                        "cursor-pointer transition-colors duration-100 border-b border-border/30",
                        isEven ? "bg-transparent" : "bg-muted/20",
                        "hover:bg-primary/5"
                      )}
                    >
                      <TableCell className="px-4 py-3 text-center text-muted-foreground font-mono font-semibold">
                        {page * pageSize + idx + 1}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="size-7 shrink-0">
                            <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
                              {getInitials(s.student_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground truncate max-w-36">{s.student_name}</p>
                            <p className="text-[10px] text-muted-foreground/60 truncate max-w-36">{s.student_email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-center font-mono font-bold text-foreground">
                        {s.solved_count}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-center">
                        <span className="font-mono text-emerald-600 dark:text-emerald-400">{s.easy_solved}</span>
                        <span className="text-muted-foreground/40 mx-1">/</span>
                        <span className="font-mono text-amber-600 dark:text-amber-400">{s.medium_solved}</span>
                        <span className="text-muted-foreground/40 mx-1">/</span>
                        <span className="font-mono text-rose-600 dark:text-rose-400">{s.hard_solved}</span>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-center font-mono font-semibold text-foreground">
                        {s.total_points}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-center">
                        {s.current_streak > 0 ? (
                          <span className="font-mono text-xs font-semibold text-foreground">
                            {s.current_streak}d
                          </span>
                        ) : (
                          <span className="text-muted-foreground/40 font-mono">—</span>
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-center text-muted-foreground">
                        {daysAgo === 999 ? (
                          <span className="text-muted-foreground/40">Never</span>
                        ) : daysAgo === 0 ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Today</span>
                        ) : (
                          <span className={cn(daysAgo >= 7 ? "text-rose-500 font-medium" : "text-muted-foreground")}>
                            {daysAgo}d ago
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-center">
                        <PlacementScoreBadge score={score} />
                      </TableCell>
                      <TableCell className="px-4 py-3 text-center">
                        {risks.length > 0 ? (
                          <Badge
                            variant="outline"
                            className="text-[10px] border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/5 font-medium"
                          >
                            At Risk
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-[10px] border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 font-medium"
                          >
                            Active
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
        <TablePaginationBar
          total={filtered.length}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize)
            setPage(0)
          }}
          itemName="students"
          pageSizeOptions={[10, 20, 50]}
        />
      </Card>

      {/* Student Detail Sheet */}
      <StudentDetailSheet
        student={selectedStudent}
        open={!!selectedStudent}
        onClose={() => setSelectedStudent(null)}
        totalProblems={totalProblems}
      />
    </div>
  )
}
