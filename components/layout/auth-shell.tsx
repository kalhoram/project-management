import Link from "next/link"
import { APP_NAME_FULL } from "@/lib/constants"

export function AuthShell({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode
  title?: string
  subtitle?: string
}) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-neutral px-4 py-10 dark:bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(0,82,204,0.08),_transparent_55%)] dark:bg-[radial-gradient(ellipse_at_top,_rgba(76,154,255,0.12),_transparent_55%)]" />
      <div className="relative z-10 mb-8 text-center">
        <Link href="/" className="inline-flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-primary text-sm font-semibold text-primary-foreground">
            YB
          </div>
          <span className="text-xl font-semibold tracking-[-0.02em]">{APP_NAME_FULL}</span>
        </Link>
        {title ? <h1 className="mt-6 text-[29px] font-bold tracking-[-0.02em]">{title}</h1> : null}
        {subtitle ? <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      <div className="relative z-10 w-full max-w-md">{children}</div>
    </div>
  )
}
