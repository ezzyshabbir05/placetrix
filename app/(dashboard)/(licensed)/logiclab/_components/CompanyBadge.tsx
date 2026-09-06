"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { CompanyInfo } from "../_constants/companies";
import { Briefcase } from "lucide-react";

interface CompanyBadgeProps {
  company: CompanyInfo;
  frequency?: number;
  size?: "xs" | "sm" | "md";
  showFrequency?: boolean;
  clickable?: boolean;
  isActive?: boolean;
  onClick?: () => void;
  className?: string;
}

export function CompanyBadge({
  company,
  frequency,
  size = "xs",
  showFrequency = true,
  clickable = false,
  isActive = false,
  onClick,
  className,
}: CompanyBadgeProps) {
  const sizeClasses = {
    xs: "text-[10px] px-2 py-0.5 gap-1.5",
    sm: "text-xs px-2.5 py-1 gap-1.5",
    md: "text-sm px-3 py-1.5 gap-2",
  };

  const freq = frequency ?? company.defaultFrequency;

  return (
    <span
      onClick={clickable ? onClick : undefined}
      title={`${company.name} (${company.category}) — Asked ~${freq}x in interviews`}
      className={cn(
        "inline-flex items-center rounded-md font-medium border transition-colors select-none",
        sizeClasses[size],
        isActive
          ? "bg-foreground text-background border-foreground font-semibold shadow-2xs"
          : "bg-muted/35 hover:bg-muted/70 text-foreground/80 border-border/60",
        clickable && "cursor-pointer hover:border-foreground/40",
        className
      )}
    >
      <span className="font-semibold tracking-tight">{company.name}</span>
      {showFrequency && freq > 0 && (
        <span
          className={cn(
            "text-muted-foreground font-mono font-normal",
            size === "xs" ? "text-[9px]" : "text-[10px]"
          )}
        >
          {freq}x
        </span>
      )}
    </span>
  );
}

interface CompanyFilterChipsProps {
  companies: CompanyInfo[];
  selectedCompany: string;
  onSelectCompany: (companyId: string) => void;
  className?: string;
}

export function CompanyFilterChips({
  companies,
  selectedCompany,
  onSelectCompany,
  className,
}: CompanyFilterChipsProps) {
  return (
    <div className={cn("flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none", className)}>
      <button
        type="button"
        onClick={() => onSelectCompany("All")}
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium border transition-colors shrink-0 cursor-pointer",
          selectedCompany === "All"
            ? "bg-foreground text-background border-foreground font-semibold shadow-2xs"
            : "bg-card hover:bg-muted text-muted-foreground hover:text-foreground border-border/60"
        )}
      >
        <Briefcase className="size-3" />
        <span>All Companies</span>
      </button>

      {companies.map((comp) => {
        const isSelected = selectedCompany.toLowerCase() === comp.name.toLowerCase();
        return (
          <button
            key={comp.id}
            type="button"
            onClick={() => onSelectCompany(isSelected ? "All" : comp.name)}
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors shrink-0 cursor-pointer",
              isSelected
                ? "bg-foreground text-background border-foreground font-semibold shadow-2xs"
                : "bg-card hover:bg-muted text-muted-foreground hover:text-foreground border-border/60"
            )}
          >
            <span>{comp.name}</span>
          </button>
        );
      })}
    </div>
  );
}
