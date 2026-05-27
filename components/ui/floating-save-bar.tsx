"use client"

import { AnimatePresence, motion } from "framer-motion"
import { Loader2, RotateCcw, Save } from "lucide-react"
import { Button } from "@/components/ui/button"

interface FloatingSaveBarProps {
    isDirty: boolean
    isPending: boolean
    onSave: () => void
    onDiscard: () => void
    message?: string
}

export function FloatingSaveBar({
    isDirty,
    isPending,
    onSave,
    onDiscard,
    message = "You have unsaved changes",
}: FloatingSaveBarProps) {
    return (
        <AnimatePresence>
            {isDirty && (
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    // Mobile: fixed full-width bar pinned to bottom
                    // Desktop (md+): centered floating pill with auto width
                    className="
            fixed bottom-0 left-0 right-0 z-50
            md:bottom-6 md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-auto
          "
                >
                    {/* Mobile shell — full-width flush bar */}
                    <div
                        className="
              flex items-center justify-between gap-3
              w-full px-4 py-3
              border-t border-border bg-background/95 backdrop-blur-md
              md:hidden
            "
                    >
                        <p className="text-sm text-muted-foreground truncate">{message}</p>
                        <div className="flex items-center gap-2 shrink-0">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onDiscard}
                                disabled={isPending}
                                className="h-9 px-3 gap-1.5"
                            >
                                <span>Discard</span>
                            </Button>
                            <Button
                                size="sm"
                                onClick={onSave}
                                disabled={isPending}
                                className="h-9 px-4 gap-1.5"
                            >
                                {isPending ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    <Save className="h-3.5 w-3.5" />
                                )}
                                <span>Save</span>
                            </Button>
                        </div>
                    </div>

                    {/* Desktop shell — centered floating pill */}
                    <div
                        className="
              hidden md:flex items-center gap-3
              px-4 py-3
              rounded-xl border border-border bg-background/80
              shadow-lg backdrop-blur-md
              whitespace-nowrap
            "
                    >
                        <span className="text-sm text-muted-foreground">{message}</span>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onDiscard}
                                disabled={isPending}
                                className="h-8 gap-1.5"
                            >
                                Discard
                            </Button>
                            <Button
                                size="sm"
                                onClick={onSave}
                                disabled={isPending}
                                className="h-8 gap-1.5"
                            >
                                {isPending ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    <Save className="h-3.5 w-3.5" />
                                )}
                                Save changes
                            </Button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
