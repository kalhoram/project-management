"use client"

import { format } from "date-fns"
import { faIR } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface DateRangePickerProps {
  from?: Date
  to?: Date
  onChange?: (range: { from?: Date; to?: Date }) => void
  className?: string
}

export function DateRangePicker({ from, to, onChange, className }: DateRangePickerProps) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="justify-start">
            <CalendarIcon className="h-4 w-4" />
            {from ? format(from, "d MMMM yyyy", { locale: faIR }) : "تاریخ شروع"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={from} onSelect={(date) => onChange?.({ from: date, to })} />
        </PopoverContent>
      </Popover>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="justify-start">
            <CalendarIcon className="h-4 w-4" />
            {to ? format(to, "d MMMM yyyy", { locale: faIR }) : "تاریخ پایان"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={to} onSelect={(date) => onChange?.({ from, to: date })} />
        </PopoverContent>
      </Popover>
    </div>
  )
}
