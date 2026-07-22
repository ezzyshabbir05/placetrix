"use client";

import * as React from "react";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from "@/components/ui/input-otp";
import { cn } from "@/lib/utils";

interface OTPInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export function OTPInput({
  length = 6,
  value,
  onChange,
  disabled,
  className,
}: OTPInputProps) {
  const half = Math.ceil(length / 2);
  const firstHalf = Array.from({ length: half });
  const secondHalf = Array.from({ length: length - half });

  return (
    <div className={cn("flex justify-center", className)}>
      <InputOTP
        maxLength={length}
        value={value}
        onChange={onChange}
        disabled={disabled}
      >
        <InputOTPGroup>
          {firstHalf.map((_, i) => (
            <InputOTPSlot key={i} index={i} />
          ))}
        </InputOTPGroup>
        {length >= 6 && <InputOTPSeparator />}
        <InputOTPGroup>
          {secondHalf.map((_, i) => (
            <InputOTPSlot key={i + half} index={i + half} />
          ))}
        </InputOTPGroup>
      </InputOTP>
    </div>
  );
}