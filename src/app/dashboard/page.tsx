import Link from "next/link"
import { addDays, startOfDay, subDays } from "date-fns"
import { fromZonedTime } from "date-fns-tz"
import { AlertTriangle, ArrowRight, BellRing, CalendarCheck2, CalendarDays, CalendarX, CheckCircle2, ExternalLink, Video } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/components/dashboard/page-header"
import { CopyLinkButton } from "@/components/dashboard/copy-link"
import { GoogleSignInButton } from "@/components/google-button"
import { db } from "@/lib/db"
import { requireUser } from "@/lib/session"
import { getCalendarStatus, listUpcomingEvents } from "@/lib/google-calendar"
import { formatDateTime, formatTime } from "@/lib/format"
import { todayIn } from "@/lib/slots"

export const metadata = { title: "Vue d'ensemble" }

export default async function DashboardPage() {
  const user = await requireUser()
  const tz = user.timezone
  const todayStart = fromZonedTime(`${todayIn(tz)}T00:00:00`, tz)
  const now = new Date()

  const [todayCount, weekCount, cancelled30, unread, upcoming, calendar] = await Promise.all([
    db.booking.count({ where: { userId: user.id, status: "CONFIRMED", startAt: { gte: todayStart, lt: addDays(todayStart, 1) } } }),
    db.booking.count({ where: { userId: user.id, status: "CONFIRMED", startAt: { gte: now, lt: addDays(now, 7) } } }),
    db.booking.count({ where: { userId: user.id, status: "CANCELLED", updatedAt: { gte: subDays(startOfDay(now), 30) } } }),
    db.notification.count({ where: { userId: user.id, readAt: null } }),
    db.booking.findMany({
      where: { userId: user.id, status: "CONFIRMED", startAt: { gte: now } },
      orderBy: { startAt: "asc" },
      take: 6,
      include: { service: { select: { name: true, color: true } } },
    }),
    getCalendarStatus(user.id),
  ])
  const events = calendar.connected ? await listUpcomingEvents(user.id, user.calendarId) : null
  const firstName = user.name.split(" ")[0]

  const stats = [
    { label: "Aujourd'hui", value: todayCount, icon: CalendarCheck2, tone: "bg-secondary text-primary" },
    { label: "7 prochains jours", value: weekCount, icon: CalendarDays, tone: "bg-secondary text-primary" },
    { label: "Annulations (30 j)", value: cancelled30, icon: CalendarX, tone: "bg-destructive/10 text-destructive" },
    { label: "Alertes non lues", value: unread, icon: BellRing, tone: "bg-cta/12 text-cta" },
  ]

  return (
    <>
      <PageHeader title={`Bonjour ${firstName}`} description="Voici ce qui vous attend.">
        {user.slug && <CopyLinkButton path={`/book/${user.slug}`} label="Copier mon lien de réservation" />}
      </PageHeader>

      {!calendar.connected && (
        <div role="alert" className="mb-6 flex flex-col gap-4 rounded-2xl border border-warning/30 bg-warning/8 p-5 sm:flex-row sm:items-center">
          <AlertTriangle className="size-6 shrink-0 text-warning" />
          <div className="flex-1">
            <p className="font-semibold">Google Calendar n&apos;est pas synchronisé</p>
            <p className="text-sm text-muted-foreground">Reconnectez votre compte pour bloquer vos créneaux occupés et ajouter les réservations à votre agenda.</p>
          </div>
          <GoogleSignInButton label="Reconnecter Google" className="sm:w-auto" />
        </div>
      )}

      <section aria-label="Statistiques" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="gap-3 py-5">
            <CardContent className="flex items-center justify-between px-5">
              <div>
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className="mt-1 text-3xl font-bold tabular-nums">{s.value}</p>
              </div>
              <span className={`grid size-11 place-items-center rounded-xl ${s.tone}`}><s.icon className="size-5" /></span>
            </CardContent>
          </Card>
        ))}
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Prochains rendez-vous</CardTitle>
              <CardDescription>Réservés via votre page Agendo</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm" className="text-primary">
              <Link href="/dashboard/bookings">Tout voir <ArrowRight className="size-4" /></Link>
            </Button>
          </CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <EmptyState slug={user.slug} />
            ) : (
              <ul className="divide-y divide-border">
                {upcoming.map((b) => (
                  <li key={b.id} className="flex items-center gap-4 py-3">
                    <div className="w-16 shrink-0 rounded-xl bg-muted py-2 text-center">
                      <p className="text-xs font-medium text-muted-foreground uppercase">{formatDateTime(b.startAt, tz, "EEE d")}</p>
                      <p className="text-sm font-bold tabular-nums">{formatTime(b.startAt, tz)}</p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{b.clientName}</p>
                      <p className="flex items-center gap-2 truncate text-sm text-muted-foreground">
                        <span className="size-2 shrink-0 rounded-full" style={{ background: b.service.color }} />
                        {b.service.name}
                      </p>
                    </div>
                    {b.meetUrl && (
                      <Button asChild variant="outline" size="sm">
                        <a href={b.meetUrl} target="_blank" rel="noreferrer"><Video className="size-4" /> Meet</a>
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Google Calendar
              {calendar.connected && <span className="inline-flex items-center gap-1 rounded-full bg-success/12 px-2 py-0.5 text-xs font-semibold text-success"><CheckCircle2 className="size-3.5" /> Connecté</span>}
            </CardTitle>
            <CardDescription>Vos prochains événements, tous agendas confondus</CardDescription>
          </CardHeader>
          <CardContent>
            {!events ? (
              <p className="text-sm text-muted-foreground">Agenda indisponible pour le moment.</p>
            ) : events.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun événement à venir.</p>
            ) : (
              <ul className="space-y-3">
                {events.map((e) => (
                  <li key={e.id} className="flex items-start gap-3">
                    <span className={`mt-1.5 size-2.5 shrink-0 rounded-full ${e.fromAgendo ? "bg-primary" : "bg-muted-foreground/40"}`} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{e.summary}</p>
                      <p className="text-xs text-muted-foreground">
                        {e.start ? (e.allDay ? formatDateTime(`${e.start}T12:00:00Z`, tz, "EEEE d MMMM") + " · journée" : formatDateTime(e.start, tz, "EEE d MMM · HH:mm")) : ""}
                      </p>
                    </div>
                    {e.link && (
                      <a href={e.link} target="_blank" rel="noreferrer" className="rounded p-1 text-muted-foreground hover:text-foreground" aria-label={`Ouvrir ${e.summary} dans Google Calendar`}>
                        <ExternalLink className="size-4" />
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}

function EmptyState({ slug }: { slug: string | null }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-border px-6 py-10 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-secondary text-primary"><CalendarDays className="size-6" /></span>
      <p className="mt-4 font-semibold">Aucun rendez-vous à venir</p>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">Partagez votre lien de réservation pour recevoir vos premiers clients.</p>
      {slug && <div className="mt-4"><CopyLinkButton path={`/book/${slug}`} variant="default" /></div>}
    </div>
  )
}
