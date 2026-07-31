import Link from "next/link"
import { APP_DESCRIPTION, APP_NAME, APP_NAME_FULL } from "@/lib/constants"
import { Button } from "@/components/ui/button"
import { LayoutGrid, ArrowLeft, CheckCircle2 } from "lucide-react"

const FEATURES = [
  "تابلوهای کانبان، لیست و خط زمانی",
  "همکاری بلادرنگ و منشن",
  "اسپرینت، نقشه راه و OKR",
  "دسترسی مبتنی بر نقش و کنترل فضای کاری",
]

const BOARD_COLUMNS = ["انجام‌نشده", "در حال انجام", "انجام‌شده"]

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-neutral dark:bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(0,82,204,0.1),_transparent_60%)] dark:bg-[radial-gradient(ellipse_at_top,_rgba(76,154,255,0.15),_transparent_60%)]" />

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" className="inline-flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-primary text-sm font-semibold text-primary-foreground">
            YB
          </div>
          <span className="text-xl font-semibold tracking-[-0.02em]">{APP_NAME_FULL}</span>
        </Link>
        <nav className="flex items-center gap-3">
          <Button variant="ghost" asChild>
            <Link href="/login">ورود</Link>
          </Button>
          <Button asChild>
            <Link href="/signup">شروع کنید</Link>
          </Button>
        </nav>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-6 pb-20 pt-12">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-primary">
              {APP_DESCRIPTION}
            </p>
            <h1 className="mt-4 text-[35px] font-bold leading-tight tracking-[-0.02em] lg:text-[42px]">
              با {APP_NAME} سریع‌تر تحویل دهید
            </h1>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-muted-foreground">
              اسپرینت برنامه‌ریزی کنید، وظایف را پیگیری کنید و تیم خود را در یک فضای کاری
              یکپارچه همسو نگه دارید.
            </p>

            <ul className="mt-8 space-y-3">
              {FEATURES.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                  {feature}
                </li>
              ))}
            </ul>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" asChild>
                <Link href="/signup">
                  شروع رایگان
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/dashboard">رفتن به داشبورد</Link>
              </Button>
            </div>
          </div>

          <div className="relative hidden lg:block">
            <div className="rounded-sm border border-border bg-card p-6 shadow-level-2">
              <div className="mb-4 flex items-center gap-2">
                <LayoutGrid className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">پیش‌نمایش تابلو اسپرینت</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {BOARD_COLUMNS.map((col, i) => (
                  <div key={col} className="rounded-sm bg-muted p-3">
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                      {col}
                    </p>
                    <div className="space-y-2">
                      {(i === 0 ? 2 : i === 1 ? 1 : 2).toString() &&
                        Array.from({ length: i === 1 ? 1 : 2 }).map((_, j) => (
                          <div
                            key={j}
                            className="rounded-sm border border-border bg-card p-2 text-xs shadow-level-1"
                          >
                            <div className="mb-1 h-1.5 w-8 rounded-full bg-primary/30" />
                            وظیفه {i * 2 + j + 1}
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
