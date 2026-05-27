// components/ui/otp-input.tsx
"use client";

import type React from "react";
import { useRef } from "react";
import { cn } from "@/lib/utils";

interface OTPInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export function OTPInput({
  length = 8,
  value,
  onChange,
  disabled,
  className,
}: OTPInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (i: number, raw: string) => {
    const digit = raw.replace(/\D/g, "").slice(-1);
    const chars = Array.from({ length }, (_, k) => value[k] ?? "");
    chars[i] = digit;
    onChange(chars.join(""));
    if (digit && i < length - 1) refs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const chars = Array.from({ length }, (_, k) => value[k] ?? "");
      if (chars[i]) {
        chars[i] = "";
        onChange(chars.join(""));
      } else if (i > 0) {
        chars[i - 1] = "";
        onChange(chars.join(""));
        refs.current[i - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && i > 0) {
      refs.current[i - 1]?.focus();
    } else if (e.key === "ArrowRight" && i < length - 1) {
      refs.current[i + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    onChange(pasted);
    const focusIdx = Math.min(pasted.length, length - 1);
    refs.current[focusIdx]?.focus();
  };

  return (
    <div className={cn("flex gap-1.5 justify-center", className)}>
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          value={value[i] ?? ""}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          disabled={disabled}
          className={cn(
            "h-11 w-9 rounded-md border bg-background text-center font-mono text-base font-semibold",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "transition-colors"
          )}
        />
      ))}
    </div>
  );
}