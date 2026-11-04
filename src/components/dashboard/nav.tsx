"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Bell, CalendarClock, CalendarDays, LayoutDashboard, Layers, Settings } from "lucide-react"
import { cn } from "@/lib/utils"

export const NAV = [
  { href: "/dashboard", label: "Vue d'ensemble", icon: LayoutDashboard },
  { href: "/dashboard/bookings", label: "Rendez-vous", icon: CalendarDays },
  { href: "/dashboard/services", label: "Prestations", icon: Layers },
  { href: "/dashboard/availability", label: "Disponibilités", icon: CalendarClock },
  { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
  { href: "/dashboard/settings", label: "Paramètres", icon: Settings },
]

export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  return (
    <nav className="flex flex-col gap-1" aria-label="Navigation principale">
      {NAV.map((item) => {
        const active = item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors duration-150",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <item.icon className={cn("size-[18px]", active && "text-primary")} />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
