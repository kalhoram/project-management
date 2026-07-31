import { AppSidebar } from "@/components/layout/app-sidebar"
import { AppTopbar } from "@/components/layout/app-topbar"
import { GlobalCommandSearch } from "@/components/layout/global-command-search"
import { MobileNav } from "@/components/layout/mobile-nav"

export function DashboardShell({
  children,
  fullWidth = false,
}: {
  children: React.ReactNode
  fullWidth?: boolean
}) {
  return (
    <div className="flex min-h-screen bg-neutral dark:bg-background">
      <AppSidebar />
      <MobileNav />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar />
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <div
            className={
              fullWidth
                ? "ms-0 me-auto w-full"
                : "ms-0 me-auto w-full max-w-[1200px]"
            }
          >
            {children}
          </div>
        </main>
      </div>
      <GlobalCommandSearch />
    </div>
  )
}
