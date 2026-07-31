"use client"

import { useTheme } from "next-themes"
import { toast } from "sonner"
import { SettingsSection } from "@/components/common/settings-section"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"

export default function AppearanceSettingsPage() {
  const { theme, setTheme } = useTheme()

  return (
    <>
      <SettingsSection title="تم" description="انتخاب ظاهر یادباکس">
        <RadioGroup value={theme ?? "system"} onValueChange={setTheme} className="space-y-2">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="light" id="light" />
            <Label htmlFor="light" className="font-normal">روشن</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="dark" id="dark" />
            <Label htmlFor="dark" className="font-normal">تیره</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="system" id="system" />
            <Label htmlFor="system" className="font-normal">سیستم</Label>
          </div>
        </RadioGroup>
      </SettingsSection>

      <SettingsSection title="تراکم" description="تنظیم تراکم اطلاعات" className="mt-4">
        <div className="max-w-md space-y-4">
          <div className="space-y-2">
            <Label>تراکم رابط کاربری</Label>
            <Select defaultValue="comfortable">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="compact">فشرده</SelectItem>
                <SelectItem value="comfortable">راحت</SelectItem>
                <SelectItem value="spacious">گشاد</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => toast.success("ظاهر ذخیره شد")}>ذخیره</Button>
        </div>
      </SettingsSection>
    </>
  )
}
