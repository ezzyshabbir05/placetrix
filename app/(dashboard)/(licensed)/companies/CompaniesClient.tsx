// app/(dashboard)/(licensed)/companies/CompaniesClient.tsx
"use client"

import { useState, useTransition, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent, EmptyMedia } from "@/components/ui/empty"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  Building2, Globe, Plus, Search, Edit3, Trash2, Loader2, 
  ExternalLink, ArrowLeft, MoreHorizontal, FileText, X
} from "lucide-react"
import { toast } from "sonner"
import { createCompanyAction, updateCompanyAction, deleteCompanyAction } from "./actions"
import type { CompanyProfile } from "../opportunities/types"

interface CompaniesClientProps {
  initialCompanies: CompanyProfile[]
}

export function CompaniesClient({ initialCompanies }: CompaniesClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [searchQuery, setSearchQuery] = useState("")

  // Local state for companies list
  const [companies, setCompanies] = useState<CompanyProfile[]>(initialCompanies)
  useEffect(() => {
    setCompanies(initialCompanies)
  }, [initialCompanies])

  // Sheet states
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [editingCompany, setEditingCompany] = useState<CompanyProfile | null>(null)

  // Form states
  const [formName, setFormName] = useState("")
  const [formLogoUrl, setFormLogoUrl] = useState("")
  const [formWebsite, setFormWebsite] = useState("")
  const [formDescription, setFormDescription] = useState("")

  const openAddSheet = () => {
    setEditingCompany(null)
    setFormName("")
    setFormLogoUrl("")
    setFormWebsite("")
    setFormDescription("")
    setIsSheetOpen(true)
  }

  const openEditSheet = (company: CompanyProfile) => {
    setEditingCompany(company)
    setFormName(company.name)
    setFormLogoUrl(company.logo_url || "")
    setFormWebsite(company.website || "")
    setFormDescription(company.description || "")
    setIsSheetOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formName.trim()) {
      toast.error("Company name is required.")
      return
    }

    startTransition(async () => {
      try {
        const payload = {
          name: formName.trim(),
          logo_url: formLogoUrl.trim() || null,
          website: formWebsite.trim() || null,
          description: formDescription.trim() || null
        }

        if (editingCompany) {
          const res = await updateCompanyAction(editingCompany.id, payload)
          if (res.success) {
            toast.success("Company profile updated successfully!")
            setIsSheetOpen(false)
            router.refresh()
          }
        } else {
          const res = await createCompanyAction(payload)
          if (res.success) {
            toast.success("Company profile created successfully!")
            setIsSheetOpen(false)
            router.refresh()
          }
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to save company profile")
      }
    })
  }

  const handleDelete = async (company: CompanyProfile) => {
    if (!confirm(`Are you sure you want to delete "${company.name}"? This cannot be undone.`)) return

    startTransition(async () => {
      try {
        const res = await deleteCompanyAction(company.id)
        if (res.success) {
          toast.success("Company profile deleted successfully.")
          router.refresh()
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete company profile")
      }
    })
  }

  // Filtered companies based on search
  const filteredCompanies = useMemo(() => {
    return companies.filter(c => 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.description || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.website || "").toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [companies, searchQuery])

  return (
    <div className="flex flex-col gap-6 px-4 py-8 md:px-8 w-full animate-in fade-in duration-500">
      
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold font-cirka tracking-tight text-foreground">
            Companies
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage company profiles for placements and internship opportunities.
          </p>
        </div>
        <Button onClick={openAddSheet} className="gap-1.5 shrink-0 self-start sm:self-auto">
          <Plus className="h-4 w-4" /> Add Company
        </Button>
      </div>

      {/* Search Bar */}
      <div className="relative w-full max-w-md">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search companies by name or description..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 pr-9"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-2.5 top-2.5 h-4 w-4 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Companies Grid */}
      {filteredCompanies.length === 0 ? (
        <Empty className="border border-dashed border-border/60 rounded-xl bg-card/50 p-12">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Building2 className="h-5 w-5 text-muted-foreground/60" />
            </EmptyMedia>
            <EmptyTitle>No companies found</EmptyTitle>
            <EmptyDescription>
              {searchQuery 
                ? "No matching companies found for your search query." 
                : "Start by creating your first company profile to link to job opportunities."}
            </EmptyDescription>
          </EmptyHeader>
          {!searchQuery && (
            <EmptyContent>
              <Button onClick={openAddSheet} size="sm" className="gap-1.5 mt-1">
                <Plus className="h-3.5 w-3.5" /> Add Company
              </Button>
            </EmptyContent>
          )}
        </Empty>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCompanies.map((company) => (
            <Card key={company.id} className="overflow-hidden p-0 shadow-xs flex flex-col justify-between">
              <div className="p-5 space-y-3.5">
                {/* Company Name and Actions */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden border">
                      {company.logo_url ? (
                        <img src={company.logo_url} alt={company.name} className="object-contain h-full w-full" />
                      ) : (
                        <Building2 className="h-5 w-5 text-muted-foreground/60" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-semibold text-sm text-foreground truncate">
                        {company.name}
                      </h4>
                      {company.website && (
                        <a 
                          href={company.website.startsWith("http") ? company.website : `https://${company.website}`} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-[10px] text-primary hover:underline flex items-center gap-0.5 mt-0.5"
                        >
                          <Globe className="h-3 w-3" />
                          <span className="truncate max-w-30">{company.website.replace(/^https?:\/\/(www\.)?/, "")}</span>
                          <ExternalLink className="h-2 w-2" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Settings Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-36">
                      <DropdownMenuItem onClick={() => openEditSheet(company)}>
                        <Edit3 className="mr-2 h-3.5 w-3.5" />
                        Edit Profile
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        variant="destructive" 
                        onClick={() => handleDelete(company)}
                      >
                        <Trash2 className="mr-2 h-3.5 w-3.5" />
                        Delete Profile
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Description */}
                <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed min-h-12">
                  {company.description || "No description provided for this company."}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Slide-over Form Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader className="pb-4">
            <SheetTitle>
              {editingCompany ? "Edit Company Profile" : "Add Company Profile"}
            </SheetTitle>
            <SheetDescription>
              {editingCompany 
                ? "Update company info used in placement drives." 
                : "Create a reusable company profile to link to job postings."}
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-4">
            <div className="space-y-1">
              <Label htmlFor="name">Company Name *</Label>
              <Input
                id="name"
                placeholder="e.g. Google"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                disabled={isPending}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="logo">Logo URL</Label>
              <Input
                id="logo"
                placeholder="e.g. https://logo.clearbit.com/google.com"
                value={formLogoUrl}
                onChange={(e) => setFormLogoUrl(e.target.value)}
                disabled={isPending}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="website">Website Link</Label>
              <Input
                id="website"
                placeholder="e.g. https://google.com"
                value={formWebsite}
                onChange={(e) => setFormWebsite(e.target.value)}
                disabled={isPending}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="description">Company Description</Label>
              <Textarea
                id="description"
                placeholder="Write a brief overview of the company..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={5}
                disabled={isPending}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsSheetOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Profile
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

    </div>
  )
}
