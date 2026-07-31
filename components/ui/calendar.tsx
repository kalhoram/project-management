"use client"

import * as React from "react"
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns"
import { faIR } from "date-fns/locale"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface CalendarProps {
  mode?: "single"
  selected?: Date
  onSelect?: (date: Date | undefined) => void
  className?: string
  disabled?: (date: Date) => boolean
}

function Calendar({ selected, onSelect, className, disabled }: CalendarProps) {
  const [month, setMonth] = React.useState(selected ?? new Date())

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 6 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 6 }),
  })

  return (
    <div className={cn("p-3", className)}>
      <div className="relative mb-4 flex items-center justify-center">
        <Button
          variant="outline"
          size="icon-sm"
          className="absolute start-1"
          onClick={() => setMonth((m) => subMonths(m, 1))}
          type="button"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <div className="text-sm font-medium">
          {format(month, "MMMM yyyy", { locale: faIR })}
        </div>
        <Button
          variant="outline"
          size="icon-sm"
          className="absolute end-1"
          onClick={() => setMonth((m) => addMonths(m, 1))}
          type="button"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>
      <div className="mb-2 grid grid-cols-7 text-center text-[0.8rem] text-muted-foreground">
        {["ش", "ی", "د", "س", "چ", "پ", "ج"].map((d) => (
          <div key={d} className="w-8 font-normal">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const isSelected = selected ? isSameDay(day, selected) : false
          const outside = !isSameMonth(day, month)
          const isDisabled = disabled?.(day) ?? false
          return (
            <button
              key={day.toISOString()}
              type="button"
              disabled={isDisabled}
              onClick={() => onSelect?.(day)}
              className={cn(
                "h-8 w-8 rounded-md p-0 text-sm hover:bg-accent",
                isSelected &&
                  "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                outside && "text-muted-foreground opacity-50",
                isSameDay(day, new Date()) && !isSelected && "bg-accent",
                isDisabled && "opacity-50"
              )}
            >
              {format(day, "d", { locale: faIR })}
            </button>
          )
        })}
      </div>
    </div>
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
