import Link from "next/link"
import { ExternalLink } from "lucide-react"
import { Logo } from "@/components/logo"
import { NavLinks } from "@/components/dashboard/nav"
import { MobileNav } from "@/components/dashboard/mobile-nav"
import { NotificationBell } from "@/components/dashboard/notification-bell"
import { UserMenu } from "@/components/dashboard/user-menu"
import { Button } from "@/components/ui/button"
import { requireUser } from "@/lib/session"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser()
  return (
    <div className="min-h-dvh bg-background">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar px-4 py-5 lg:flex">
        <Logo href="/dashboard" className="px-2" />
        <div className="mt-8 flex-1">
          <NavLinks />
        </div>
        {user.slug && (
          <div className="rounded-2xl border border-border bg-secondary/60 p-4">
            <p className="text-sm font-semibold text-secondary-foreground">Votre page publique</p>
            <p className="mt-1 truncate text-xs text-muted-foreground">/book/{user.slug}</p>
            <Button asChild size="sm" className="mt-3 w-full">
              <Link href={`/book/${user.slug}`} target="_blank">Ouvrir <ExternalLink className="size-3.5" /></Link>
            </Button>
          </div>
        )}
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-border/70 bg-background/85 px-4 backdrop-blur sm:px-6">
          <MobileNav />
          <Logo href="/dashboard" className="lg:hidden" />
          <div className="ml-auto flex items-center gap-2">
            <NotificationBell />
            <UserMenu name={user.name} email={user.email} image={user.image} slug={user.slug} />
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">{children}</main>
      </div>
    </div>
  )
}
