"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import { fr } from "date-fns/locale"
import { AlertTriangle, Bell, CalendarPlus, CalendarX, CheckCheck, Clock } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

type Item = {
  id: string
  type: "BOOKING_CREATED" | "BOOKING_CANCELLED" | "BOOKING_REMINDER" | "CALENDAR_SYNC_ERROR" | "DELIVERY_FAILED"
  title: string
  body: string
  readAt: string | null
  createdAt: string
}

const POLL_MS = 30_000

async function fetchNotifications(): Promise<{ items: Item[]; unread: number } | null> {
  try {
    const res = await fetch("/api/notifications", { cache: "no-store" })
    return res.ok ? await res.json() : null
  } catch {
    return null // réseau indisponible : on réessaie au prochain tour
  }
}

export const NOTIF_STYLE: Record<Item["type"], { icon: typeof Bell; className: string }> = {
  BOOKING_CREATED: { icon: CalendarPlus, className: "bg-secondary text-primary" },
  BOOKING_CANCELLED: { icon: CalendarX, className: "bg-destructive/10 text-destructive" },
  BOOKING_REMINDER: { icon: Clock, className: "bg-cta/12 text-cta" },
  CALENDAR_SYNC_ERROR: { icon: AlertTriangle, className: "bg-warning/12 text-warning" },
  DELIVERY_FAILED: { icon: AlertTriangle, className: "bg-warning/12 text-warning" },
}

export function NotificationBell() {
  const router = useRouter()
  const [items, setItems] = useState<Item[]>([])
  const [unread, setUnread] = useState(0)
  const [open, setOpen] = useState(false)
  const seen = useRef<Set<string> | null>(null)

  const apply = useCallback(
    (data: { items: Item[]; unread: number } | null) => {
      if (!data) return
      // Alerte (toast) pour chaque notification arrivée depuis le dernier passage
      if (seen.current) {
        const fresh = data.items.filter((i) => !i.readAt && !seen.current!.has(i.id))
        for (const n of fresh.slice(0, 3)) {
          const isError = n.type === "CALENDAR_SYNC_ERROR" || n.type === "DELIVERY_FAILED"
          toast[isError ? "warning" : "info"](n.title, {
            description: n.body,
            action: { label: "Voir", onClick: () => router.push("/dashboard/notifications") },
          })
        }
        if (fresh.length) router.refresh()
      }
      seen.current = new Set(data.items.map((i) => i.id))
      setItems(data.items)
      setUnread(data.unread)
    },
    [router],
  )

  useEffect(() => {
    const tick = () => fetchNotifications().then(apply)
    tick()
    const timer = setInterval(() => document.visibilityState === "visible" && tick(), POLL_MS)
    window.addEventListener("focus", tick)
    return () => {
      clearInterval(timer)
      window.removeEventListener("focus", tick)
    }
  }, [apply])

  async function markAllRead() {
    setItems((list) => list.map((i) => ({ ...i, readAt: i.readAt ?? new Date().toISOString() })))
    setUnread(0)
    await fetch("/api/notifications/read", { method: "POST", body: JSON.stringify({ all: true }) })
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={unread ? `Notifications, ${unread} non lues` : "Notifications"}>
          <Bell className="size-5" />
          {unread > 0 && (
            <span className="absolute top-1 right-1 grid min-w-[18px] place-items-center rounded-full bg-cta px-1 text-[10px] leading-[18px] font-bold text-cta-foreground ring-2 ring-background">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(92vw,380px)] p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="font-semibold">Notifications</p>
          {unread > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllRead} className="text-primary">
              <CheckCheck className="size-4" /> Tout marquer lu
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-96">
          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-10 text-center text-sm text-muted-foreground">
              <Bell className="size-6" />
              Aucune notification pour l&apos;instant.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((n) => {
                const style = NOTIF_STYLE[n.type]
                return (
                  <li key={n.id} className={cn("flex gap-3 px-4 py-3", !n.readAt && "bg-secondary/40")}>
                    <span className={cn("mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg", style.className)}>
                      <style.icon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 text-sm font-semibold">
                        {n.title}
                        {!n.readAt && <span className="size-2 rounded-full bg-cta" aria-label="non lue" />}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{n.body}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: fr })}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </ScrollArea>
        <div className="border-t border-border p-2">
          <Button asChild variant="ghost" className="w-full" onClick={() => setOpen(false)}>
            <Link href="/dashboard/notifications">Voir tout l&apos;historique</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
