import Link from "next/link"
import { CalendarDays, Mail, Phone, Video } from "lucide-react"
import { Card } from "@/components/ui/card"
import { PageHeader } from "@/components/dashboard/page-header"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { BookingActions } from "@/components/dashboard/booking-actions"
import { db } from "@/lib/db"
import { requireUser } from "@/lib/session"
import { formatDateTime, formatTime } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Prisma } from "@/lib/generated/prisma/client"

export const metadata = { title: "Rendez-vous" }

const TABS = [
  { key: "upcoming", label: "À venir" },
  { key: "past", label: "Passés" },
  { key: "cancelled", label: "Annulés" },
] as const

type Tab = (typeof TABS)[number]["key"]

export default async function BookingsPage({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string }> }) {
  const user = await requireUser()
  const { tab: rawTab, q } = await searchParams
  const tab: Tab = TABS.some((t) => t.key === rawTab) ? (rawTab as Tab) : "upcoming"
  const now = new Date()
  const tz = user.timezone

  const where: Prisma.BookingWhereInput = {
    userId: user.id,
    ...(tab === "upcoming" && { status: "CONFIRMED", endAt: { gte: now } }),
    ...(tab === "past" && { status: { not: "CANCELLED" }, endAt: { lt: now } }),
    ...(tab === "cancelled" && { status: "CANCELLED" }),
    ...(q && {
      OR: [
        { clientName: { contains: q, mode: "insensitive" } },
        { clientEmail: { contains: q, mode: "insensitive" } },
      ],
    }),
  }
  const bookings = await db.booking.findMany({
    where,
    orderBy: { startAt: tab === "upcoming" ? "asc" : "desc" },
    take: 100,
    include: { service: { select: { name: true, color: true } } },
  })

  // Regroupement par jour
  const groups = new Map<string, typeof bookings>()
  for (const b of bookings) {
    const key = formatDateTime(b.startAt, tz, "EEEE d MMMM yyyy")
    groups.set(key, [...(groups.get(key) ?? []), b])
  }

  return (
    <>
      <PageHeader title="Rendez-vous" description="Toutes les réservations faites via votre page." />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <nav className="inline-flex rounded-xl bg-muted p-1" aria-label="Filtrer les rendez-vous">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={`?tab=${t.key}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              aria-current={tab === t.key ? "page" : undefined}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                tab === t.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </Link>
          ))}
        </nav>
        <form className="w-full sm:w-72">
          <input type="hidden" name="tab" value={tab} />
          <label htmlFor="q" className="sr-only">Rechercher un client</label>
          <input
            id="q"
            name="q"
            defaultValue={q}
            placeholder="Rechercher un client…"
            className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </form>
      </div>

      {bookings.length === 0 ? (
        <Card className="items-center px-6 py-16 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-secondary text-primary"><CalendarDays className="size-6" /></span>
          <p className="font-semibold">Aucun rendez-vous {tab === "upcoming" ? "à venir" : tab === "past" ? "passé" : "annulé"}</p>
        </Card>
      ) : (
        <div className="space-y-8">
          {[...groups.entries()].map(([day, list]) => (
            <section key={day}>
              <h2 className="mb-3 text-sm font-semibold text-muted-foreground first-letter:uppercase">{day}</h2>
              <Card className="gap-0 py-0">
                <ul className="divide-y divide-border">
                  {list.map((b) => (
                    <li key={b.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                      <div className="flex items-center gap-4 sm:w-40">
                        <span className="h-10 w-1 rounded-full" style={{ background: b.service.color }} />
                        <div>
                          <p className="font-bold tabular-nums">{formatTime(b.startAt, tz)} – {formatTime(b.endAt, tz)}</p>
                          <p className="text-sm text-muted-foreground">{b.service.name}</p>
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">{b.clientName}</p>
                        <div className="mt-0.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                          <a href={`mailto:${b.clientEmail}`} className="inline-flex items-center gap-1.5 hover:text-foreground"><Mail className="size-3.5" />{b.clientEmail}</a>
                          {b.clientPhone && <a href={`tel:${b.clientPhone}`} className="inline-flex items-center gap-1.5 hover:text-foreground"><Phone className="size-3.5" />{b.clientPhone}</a>}
                        </div>
                        {b.notes && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground italic">« {b.notes} »</p>}
                        {b.status === "CANCELLED" && b.cancelReason && <p className="mt-1 text-sm text-destructive">Motif : {b.cancelReason}</p>}
                      </div>
                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        {b.meetUrl && b.status === "CONFIRMED" && (
                          <a href={b.meetUrl} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium hover:bg-muted">
                            <Video className="size-4" /> Meet
                          </a>
                        )}
                        <StatusBadge status={b.status} />
                        <BookingActions id={b.id} status={b.status} isPast={b.endAt < now} clientName={b.clientName} />
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            </section>
          ))}
        </div>
      )}
    </>
  )
}
