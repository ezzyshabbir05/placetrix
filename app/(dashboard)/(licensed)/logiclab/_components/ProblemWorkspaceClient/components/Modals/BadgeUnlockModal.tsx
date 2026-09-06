"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as htmlToImage from "html-to-image";
import { toast } from "sonner";
import { IconSparkles, IconDownload } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BadgeUnlockModalProps {
  badge: any | null;
  userProfile?: any;
  onClose: () => void;
}

export function BadgeUnlockModal({ badge, userProfile, onClose }: BadgeUnlockModalProps) {
  const badgeCardRef = useRef<HTMLDivElement>(null);
  const [badgeDataUrl, setBadgeDataUrl] = useState<string | null>(null);

  // Fetch the image as a blob to bypass html-to-image CORS issues
  useEffect(() => {
    if (badge?.icon_name) {
      fetch(badge.icon_name)
        .then((res) => res.blob())
        .then((blob) => {
          const reader = new FileReader();
          reader.onloadend = () => setBadgeDataUrl(reader.result as string);
          reader.readAsDataURL(blob);
        })
        .catch(console.error);
    } else {
      setBadgeDataUrl(null);
    }
  }, [badge]);

  const handleDownloadBadge = async () => {
    if (!badgeCardRef.current) return;
    try {
      const dataUrl = await htmlToImage.toPng(badgeCardRef.current, {
        pixelRatio: 2,
        fontEmbedCSS: "",
        filter: (node) => {
          if (node?.getAttribute && node.getAttribute("data-html2canvas-ignore") === "true") {
            return false;
          }
          return true;
        },
      });
      const link = document.createElement("a");
      link.download = `LogicLab_Badge_${badge?.name?.replace(/\s+/g, "_") || "Achievement"}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("Badge downloaded successfully!");
    } catch (err) {
      console.error("Failed to download badge:", err);
      toast.error("Failed to download badge image.");
    }
  };

  return (
    <AnimatePresence>
      {badge && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={cn(
            "fixed inset-0 z-9999 flex flex-col items-center justify-center bg-black/60 backdrop-blur-xs p-4"
          )}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.92, y: 15, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.92, y: 15, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={cn("relative flex flex-col items-center w-full max-w-sm")}
            onClick={(e) => e.stopPropagation()}
          >
            {/* The Badge Card */}
            <div
              ref={badgeCardRef}
              className={cn(
                "w-full flex flex-col items-center rounded-2xl shadow-2xl p-8 pb-6 border bg-card border-border/70"
              )}
            >
              {/* Brand watermark */}
              <div className="w-full text-left mb-6">
                <span className="text-[10px] tracking-widest uppercase font-bold text-muted-foreground select-none">
                  PLACETRIX.APP — LOGICLAB
                </span>
              </div>

              <div className="w-full text-center mb-8">
                <h2 className="text-2xl font-black mb-1 text-foreground tracking-tight">
                  Achievement Unlocked
                </h2>
                <p className="text-sm font-medium text-muted-foreground">
                  Congratulations,{" "}
                  {userProfile?.full_name?.split(" ")[0] || userProfile?.username || "Coder"}!
                </p>
              </div>

              <div className="relative mb-8 flex justify-center w-full">
                {/* Subtle emerald glow */}
                <div
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full pointer-events-none bg-emerald-500/15 blur-2xl"
                />

                <motion.div
                  initial={{ rotateY: 90, scale: 0.8 }}
                  animate={{ rotateY: 0, scale: 1 }}
                  transition={{ delay: 0.1, duration: 0.6, type: "spring", damping: 15 }}
                  className="relative w-36 h-36 z-10 drop-shadow-2xl"
                >
                  {badge.icon_name ? (
                    <img
                      src={badgeDataUrl || badge.icon_name}
                      alt={badge.name}
                      crossOrigin="anonymous"
                      className="w-full h-full object-contain block"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full border-4 flex items-center justify-center bg-muted border-primary/20">
                      <IconSparkles className="h-12 w-12 text-primary" />
                    </div>
                  )}
                </motion.div>
              </div>

              <div className="w-full text-center mb-6">
                <h3 className="text-xl font-bold mb-1.5 text-foreground">{badge.name}</h3>
                {badge.description && (
                  <p className="text-sm font-medium text-muted-foreground leading-relaxed">
                    {badge.description}
                  </p>
                )}
              </div>

              {/* Earned Date */}
              <div className="text-[9px] tracking-wider font-mono font-bold mt-2 uppercase text-muted-foreground/70">
                EARNED ON{" "}
                {new Date()
                  .toLocaleDateString("en-US", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                  .toUpperCase()}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2.5 w-full mt-4">
              <Button size="lg" onClick={onClose} className="w-full h-11 font-semibold">
                Continue
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={(e) => {
                  e.preventDefault();
                  handleDownloadBadge();
                }}
                className="w-full h-11 font-semibold"
              >
                <IconDownload className="mr-2 h-4 w-4" />
                Download Badge
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
