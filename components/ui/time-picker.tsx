"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export interface TimePickerProps {
  value?: string // format "HH:mm" or "hh:mm AM/PM"
  onChange?: (time: string) => void
  disabled?: boolean
  className?: string
  id?: string
}

export function TimePicker({
  value = "",
  onChange,
  disabled = false,
  className,
  id,
}: TimePickerProps) {
  // Parse initial 12-hour values
  const { initialH12, initialMin, initialAmPm } = React.useMemo(() => {
    if (!value) return { initialH12: 12, initialMin: 0, initialAmPm: "AM" as const }
    const match12 = value.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i)
    if (match12) {
      let h = parseInt(match12[1], 10)
      const m = parseInt(match12[2], 10)
      const ap = (match12[3] || "AM").toUpperCase() as "AM" | "PM"
      if (h > 12) {
        h = h % 12 || 12
      }
      return { initialH12: h, initialMin: m, initialAmPm: ap }
    }
    return { initialH12: 12, initialMin: 0, initialAmPm: "AM" as const }
  }, [value])

  const [h12Str, setH12Str] = React.useState(String(initialH12).padStart(2, "0"))
  const [minStr, setMinStr] = React.useState(String(initialMin).padStart(2, "0"))
  const [ampm, setAmPm] = React.useState<"AM" | "PM">(initialAmPm)

  React.useEffect(() => {
    setH12Str(String(initialH12).padStart(2, "0"))
    setMinStr(String(initialMin).padStart(2, "0"))
    setAmPm(initialAmPm)
  }, [initialH12, initialMin, initialAmPm])

  const emitChange = (h: number, m: number, ap: "AM" | "PM") => {
    let h24 = h % 12
    if (ap === "PM") h24 += 12
    const formatted24 = `${String(h24).padStart(2, "0")}:${String(m).padStart(2, "0")}`
    onChange?.(formatted24)
  }

  return (
    <div id={id} className={cn("inline-flex items-center gap-1.5 p-1.5 rounded-md border border-input bg-background shadow-xs", className)}>
      <Input
        type="number"
        min={1}
        max={12}
        value={h12Str}
        disabled={disabled}
        onChange={(e) => {
          setH12Str(e.target.value)
          const val = parseInt(e.target.value, 10)
          if (!isNaN(val) && val >= 1 && val <= 12) {
            emitChange(val, parseInt(minStr, 10) || 0, ampm)
          }
        }}
        onBlur={() => {
          const val = parseInt(h12Str, 10)
          if (isNaN(val) || val < 1 || val > 12) {
            setH12Str(String(initialH12).padStart(2, "0"))
          } else {
            setH12Str(String(val).padStart(2, "0"))
          }
        }}
        className="w-12 h-8 text-center text-xs bg-background font-mono p-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <span className="text-muted-foreground font-bold text-xs">:</span>
      <Input
        type="number"
        min={0}
        max={59}
        value={minStr}
        disabled={disabled}
        onChange={(e) => {
          setMinStr(e.target.value)
          const val = parseInt(e.target.value, 10)
          if (!isNaN(val) && val >= 0 && val <= 59) {
            emitChange(parseInt(h12Str, 10) || 12, val, ampm)
          }
        }}
        onBlur={() => {
          const val = parseInt(minStr, 10)
          if (isNaN(val) || val < 0 || val > 59) {
            setMinStr(String(initialMin).padStart(2, "0"))
          } else {
            setMinStr(String(val).padStart(2, "0"))
          }
        }}
        className="w-12 h-8 text-center text-xs bg-background font-mono p-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <Select
        value={ampm}
        disabled={disabled}
        onValueChange={(val: "AM" | "PM") => {
          setAmPm(val)
          emitChange(parseInt(h12Str, 10) || 12, parseInt(minStr, 10) || 0, val)
        }}
      >
        <SelectTrigger className="w-17 h-8 text-xs bg-background font-semibold px-2">
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end">
          <SelectItem value="AM" className="text-xs font-medium">AM</SelectItem>
          <SelectItem value="PM" className="text-xs font-medium">PM</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
