"use client"

import { toast } from "sonner"
import { SettingsSection } from "@/components/common/settings-section"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"

export default function LanguageSettingsPage() {
  return (
    <SettingsSection title="زبان و منطقه" description="زبان نمایش و قالب تاریخ">
      <div className="max-w-md space-y-4">
        <div className="space-y-2">
          <Label>زبان نمایش</Label>
          <Select defaultValue="fa">
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="fa">فارسی</SelectItem>
              <SelectItem value="en">انگلیسی (آمریکا)</SelectItem>
              <SelectItem value="en-gb">انگلیسی (بریتانیا)</SelectItem>
              <SelectItem value="es">اسپانیایی</SelectItem>
              <SelectItem value="fr">فرانسوی</SelectItem>
              <SelectItem value="de">آلمانی</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>قالب تاریخ</Label>
          <Select defaultValue="dmy">
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="mdy">ماه/روز/سال</SelectItem>
              <SelectItem value="dmy">روز/ماه/سال</SelectItem>
              <SelectItem value="iso">سال-ماه-روز</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>قالب ساعت</Label>
          <Select defaultValue="24">
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="12">۱۲ ساعته</SelectItem>
              <SelectItem value="24">۲۴ ساعته</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => toast.success("تنظیمات زبان ذخیره شد")}>ذخیره</Button>
      </div>
    </SettingsSection>
  )
}
