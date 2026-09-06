'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { CalendarIcon, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { TimePicker } from '@/components/ui/time-picker';

export { DatePicker, TimePicker };

export interface DateTimePickerProps {
  value?: Date | string | null;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  modal?: boolean;
  clearable?: boolean;
  hideTime?: boolean;
  use12HourFormat?: boolean;
  min?: Date;
  max?: Date;
}

function parseToDate(val?: Date | string | null): Date | undefined {
  if (!val) return undefined;
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? undefined : val;
  }
  const d = new Date(val);
  return isNaN(d.getTime()) ? undefined : d;
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = 'Pick date & time',
  disabled = false,
  className,
  id,
  modal = false,
  clearable = true,
  hideTime = false,
}: DateTimePickerProps) {
  const selectedDate = React.useMemo(() => parseToDate(value), [value]);
  const [open, setOpen] = React.useState(false);

  // Calculate 12-hour components from selectedDate
  const { hour12, minute, ampm } = React.useMemo(() => {
    if (!selectedDate) {
      return { hour12: 12, minute: 0, ampm: 'AM' as const };
    }
    const h24 = selectedDate.getHours();
    const m = selectedDate.getMinutes();
    const isPm = h24 >= 12;
    let h12 = h24 % 12;
    if (h12 === 0) h12 = 12;
    return { hour12: h12, minute: m, ampm: isPm ? ('PM' as const) : ('AM' as const) };
  }, [selectedDate]);

  // Internal inputs state for smooth typing
  const [hourStr, setHourStr] = React.useState(String(hour12).padStart(2, '0'));
  const [minuteStr, setMinuteStr] = React.useState(String(minute).padStart(2, '0'));

  React.useEffect(() => {
    setHourStr(String(hour12).padStart(2, '0'));
    setMinuteStr(String(minute).padStart(2, '0'));
  }, [hour12, minute]);

  const updateTime = (newH12: number, newMin: number, newAmPm: 'AM' | 'PM') => {
    let h24 = newH12 % 12;
    if (newAmPm === 'PM') h24 += 12;

    const baseDate = selectedDate ? new Date(selectedDate) : new Date();
    baseDate.setHours(h24);
    baseDate.setMinutes(newMin);
    baseDate.setSeconds(0);
    baseDate.setMilliseconds(0);

    onChange?.(baseDate);
  };

  const handleDateSelect = (newDate: Date | undefined) => {
    if (!newDate) {
      onChange?.(undefined);
      return;
    }
    const updated = new Date(newDate);
    let h24 = hour12 % 12;
    if (ampm === 'PM') h24 += 12;

    updated.setHours(h24);
    updated.setMinutes(minute);
    updated.setSeconds(0);
    updated.setMilliseconds(0);

    onChange?.(updated);
  };

  const handleHourChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setHourStr(raw);
    const parsed = parseInt(raw, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 12) {
      updateTime(parsed, minute, ampm);
    }
  };

  const handleHourBlur = () => {
    const parsed = parseInt(hourStr, 10);
    if (isNaN(parsed) || parsed < 1 || parsed > 12) {
      setHourStr(String(hour12).padStart(2, '0'));
    } else {
      setHourStr(String(parsed).padStart(2, '0'));
    }
  };

  const handleMinuteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setMinuteStr(raw);
    const parsed = parseInt(raw, 10);
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 59) {
      updateTime(hour12, parsed, ampm);
    }
  };

  const handleMinuteBlur = () => {
    const parsed = parseInt(minuteStr, 10);
    if (isNaN(parsed) || parsed < 0 || parsed > 59) {
      setMinuteStr(String(minute).padStart(2, '0'));
    } else {
      setMinuteStr(String(parsed).padStart(2, '0'));
    }
  };

  const handleAmPmChange = (val: 'AM' | 'PM') => {
    updateTime(hour12, minute, val);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange?.(undefined);
  };

  const displayFormat = hideTime ? 'PPP' : 'PPP, p';

  return (
    <Popover open={open} onOpenChange={setOpen} modal={modal}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          disabled={disabled}
          className={cn(
            'w-full justify-start text-left font-normal bg-background hover:bg-accent/50 group relative pr-8',
            !selectedDate && 'text-muted-foreground',
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="truncate">
            {selectedDate ? (
              format(selectedDate, displayFormat)
            ) : (
              <span>{placeholder}</span>
            )}
          </span>
          {clearable && selectedDate && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              <span className="sr-only">Clear date</span>
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleDateSelect}
          initialFocus
        />
        {!hideTime && (
          <>
            <Separator />
            <div className="p-3 bg-muted/30 flex items-center justify-between gap-2">
              <div className="text-xs text-muted-foreground font-medium shrink-0">
                Time
              </div>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min={1}
                  max={12}
                  value={hourStr}
                  disabled={disabled}
                  onChange={handleHourChange}
                  onBlur={handleHourBlur}
                  className="w-12 h-8 text-center text-xs bg-background font-mono p-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="text-muted-foreground font-bold text-xs">:</span>
                <Input
                  type="number"
                  min={0}
                  max={59}
                  value={minuteStr}
                  disabled={disabled}
                  onChange={handleMinuteChange}
                  onBlur={handleMinuteBlur}
                  className="w-12 h-8 text-center text-xs bg-background font-mono p-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <Select
                  value={ampm}
                  disabled={disabled}
                  onValueChange={(val: 'AM' | 'PM') => handleAmPmChange(val)}
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
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
