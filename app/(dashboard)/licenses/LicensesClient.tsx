"use client";

import React, { useState, useTransition, useMemo } from "react";
import { Search, Shield, Calendar, Edit2, Info, Loader2, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { upsertInstituteLicense, type LicenseStatus } from "@/lib/supabase/license";

interface LicenseData {
  id?: string;
  status: LicenseStatus;
  plan_name: string;
  starts_at: string | null;
  ends_at: string | null;
  notes: string | null;
}

interface InstituteWithLicense {
  id: string;
  institute_name: string;
  logo_path: string | null;
  license: LicenseData | null;
}

interface LicensesClientProps {
  initialInstitutes: InstituteWithLicense[];
}

export function LicensesClient({ initialInstitutes }: LicensesClientProps) {
  const [institutes, setInstitutes] = useState<InstituteWithLicense[]>(initialInstitutes);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedInstitute, setSelectedInstitute] = useState<InstituteWithLicense | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Form State
  const [status, setStatus] = useState<LicenseStatus>("pending");
  const [planName, setPlanName] = useState("Standard");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [notes, setNotes] = useState("");

  const filteredInstitutes = useMemo(() => {
    return institutes.filter((inst) =>
      inst.institute_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [institutes, searchTerm]);

  const handleOpenDialog = (inst: InstituteWithLicense) => {
    setSelectedInstitute(inst);
    // If the dynamic status is "expired", it represents an underlying DB status of "active"
    const formStatus = inst.license?.status === "expired" ? "active" : (inst.license?.status ?? "pending");
    setStatus(formStatus);
    setPlanName(inst.license?.plan_name ?? "Standard");
    setStartsAt(inst.license?.starts_at ? new Date(inst.license.starts_at).toISOString().split("T")[0] : "");
    setEndsAt(inst.license?.ends_at ? new Date(inst.license.ends_at).toISOString().split("T")[0] : "");
    setNotes(inst.license?.notes ?? "");
    setIsDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInstitute) return;

    if (startsAt && endsAt && new Date(endsAt) < new Date(startsAt)) {
      toast.error("End date cannot be earlier than start date");
      return;
    }

    startTransition(async () => {
      try {
        const payload = {
          institute_id: selectedInstitute.id,
          status,
          plan_name: planName,
          starts_at: startsAt ? new Date(startsAt).toISOString() : null,
          ends_at: endsAt ? new Date(endsAt).toISOString() : null,
          notes: notes.trim() || null,
        };

        const result = await upsertInstituteLicense(payload);
        if (result.success && result.license) {
          toast.success("License successfully updated for " + selectedInstitute.institute_name);

          // Update local state with the returned calculated license data
          setInstitutes((prev) =>
            prev.map((inst) =>
              inst.id === selectedInstitute.id
                ? { ...inst, license: result.license }
                : inst
            )
          );
          setIsDialogOpen(false);
        }
      } catch (err: any) {
        console.error(err);
        toast.error(err.message || "Failed to update license");
      }
    });
  };

  const getStatusBadge = (status: LicenseStatus) => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-emerald-500 hover:bg-emerald-500 text-white font-medium border-0 px-2.5 py-0.5">
            Active
          </Badge>
        );
      case "expired":
        return (
          <Badge variant="destructive" className="font-medium border-0 px-2.5 py-0.5">
            Expired
          </Badge>
        );
      case "revoked":
        return (
          <Badge variant="destructive" className="bg-rose-600 hover:bg-rose-600 font-medium border-0 px-2.5 py-0.5">
            Revoked
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-amber-500 hover:bg-amber-500 text-white font-medium border-0 px-2.5 py-0.5">
            Pending
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="font-medium px-2.5 py-0.5">
            Unassigned
          </Badge>
        );
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      dateStyle: "medium",
    });
  };

  return (
    <div className="space-y-6">
      {/* Search and Controls */}
      <div className="flex items-center gap-3 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search colleges..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Institutes List */}
      <div className="flex flex-col gap-3 w-full">
        {filteredInstitutes.map((inst) => {
          const hasLicense = !!inst.license;
          return (
            <Card key={inst.id} className="overflow-hidden hover:shadow-sm transition-shadow">
              <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Left: Info */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-base truncate text-foreground">
                      {inst.institute_name}
                    </h3>
                    <div className="shrink-0">
                      {getStatusBadge(inst.license?.status ?? null)}
                    </div>
                  </div>

                  {hasLicense ? (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                        <span>Plan: <strong>{inst.license?.plan_name}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>
                          {formatDate(inst.license?.starts_at ?? null)} - {formatDate(inst.license?.ends_at ?? null)}
                        </span>
                      </div>
                      {inst.license?.notes && (
                        <div className="flex items-center gap-1.5 text-muted-foreground/80 max-w-md truncate">
                          <Info className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                          <span className="truncate">{inst.license?.notes}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground/60 italic">
                      No active subscription setup yet.
                    </p>
                  )}
                </div>

                {/* Right: Actions */}
                <div className="shrink-0 flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 h-9"
                    onClick={() => handleOpenDialog(inst)}
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    Manage License
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {filteredInstitutes.length === 0 && (
          <div className="py-12 text-center text-muted-foreground bg-muted/30 rounded-lg border border-dashed">
            No colleges match your search.
          </div>
        )}
      </div>

      {/* Manage License Modal */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle className="line-clamp-1">
                Manage License: {selectedInstitute?.institute_name}
              </DialogTitle>
              <DialogDescription>
                Assign or update plan metadata and dates for this institution.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              {/* Plan Name */}
              <div className="grid gap-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Plan Name
                </label>
                <Input
                  required
                  placeholder="e.g. Standard, Premium, Enterprise"
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                />
              </div>

              {/* License Status */}
              <div className="grid gap-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  License Status
                </label>
                <Select value={status ?? undefined} onValueChange={(val) => setStatus(val as LicenseStatus)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select license status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="revoked">Revoked</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Start & End Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Starts At
                  </label>
                  <Input
                    type="date"
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Ends At
                  </label>
                  <Input
                    type="date"
                    value={endsAt}
                    onChange={(e) => setEndsAt(e.target.value)}
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="grid gap-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Internal Notes
                </label>
                <Textarea
                  placeholder="Add any internal deployment details..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsDialogOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} className="gap-1.5">
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
