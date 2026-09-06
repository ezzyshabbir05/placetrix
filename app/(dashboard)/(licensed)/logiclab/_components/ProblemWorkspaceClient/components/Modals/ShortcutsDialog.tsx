"use client";

import React from "react";
import { IconKeyboard } from "@tabler/icons-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";

interface ShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isMac?: boolean;
}

export function ShortcutsDialog({ open, onOpenChange, isMac = false }: ShortcutsDialogProps) {
  const modKey = isMac ? "⌘" : "Ctrl";
  const altKey = isMac ? "⌥" : "Alt";

  const shortcuts = [
    {
      title: "Run Code",
      keys: [modKey, "Enter"],
    },
    {
      title: "Submit Solution",
      keys: [modKey, "Shift", "Enter"],
    },
    {
      title: "Format Code",
      keys: ["Shift", altKey, "F"],
    },
    {
      title: "Next Problem",
      keys: [altKey, "N"],
    },
    {
      title: "Previous Problem",
      keys: [altKey, "P"],
    },
    {
      title: "Zoom In / Zoom Out",
      keys: [modKey, "+ / -"],
    },
    {
      title: "Open Shortcuts Help",
      keys: ["Shift", "?"],
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("sm:max-w-md select-none border-border/80 bg-background shadow-2xl")}>
        <DialogHeader>
          <DialogTitle className={cn("flex items-center gap-2 text-base font-bold text-foreground")}>
            <IconKeyboard className="h-5 w-5 text-emerald-500" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Master speed shortcuts to navigate and code faster in LogicLab.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1 py-2 text-xs">
          {shortcuts.map((sc, i) => (
            <div
              key={i}
              className={cn(
                "flex items-center justify-between py-2 border-b border-border/40 last:border-b-0"
              )}
            >
              <span className="font-medium text-foreground">{sc.title}</span>
              <KbdGroup>
                {sc.keys.map((k, j) => (
                  <React.Fragment key={j}>
                    <Kbd>{k}</Kbd>
                    {j < sc.keys.length - 1 && <span className="text-muted-foreground/60">+</span>}
                  </React.Fragment>
                ))}
              </KbdGroup>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
