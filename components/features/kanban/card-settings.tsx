"use client"

import { Settings2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useUIStore } from "@/stores/ui-store"

export interface CardDisplaySettings {
  showLabels: boolean
  showChecklist: boolean
  showDueDate: boolean
  showPriority: boolean
  showAssignee: boolean
}

export const DEFAULT_CARD_SETTINGS: CardDisplaySettings = {
  showLabels: true,
  showChecklist: true,
  showDueDate: true,
  showPriority: true,
  showAssignee: true,
}

interface CardSettingsProps {
  settings: CardDisplaySettings
  onChange: (settings: CardDisplaySettings) => void
}

export function CardSettings({ settings, onChange }: CardSettingsProps) {
  const density = useUIStore((s) => s.density)
  const setDensity = useUIStore((s) => s.setDensity)

  function update<K extends keyof CardDisplaySettings>(key: K, value: CardDisplaySettings[K]) {
    onChange({ ...settings, [key]: value })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings2 className="h-4 w-4" />
          تنظیمات کارت
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>نمایش کارت</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="space-y-3 p-2">
          {(
            [
              ["showAssignee", "مسئول"],
              ["showDueDate", "مهلت"],
              ["showPriority", "اولویت"],
              ["showLabels", "برچسب‌ها"],
              ["showChecklist", "پیشرفت چک‌لیست"],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="flex items-center justify-between gap-2">
              <Label htmlFor={key} className="text-sm font-normal">
                {label}
              </Label>
              <Switch
                id={key}
                checked={settings[key]}
                onCheckedChange={(checked) => update(key, checked)}
              />
            </div>
          ))}
          <DropdownMenuSeparator />
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="density" className="text-sm font-normal">
              تراکم فشرده
            </Label>
            <Switch
              id="density"
              checked={density === "compact"}
              onCheckedChange={(checked) => setDensity(checked ? "compact" : "comfortable")}
            />
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
