import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { CalendarCheck2, CalendarPlus, CalendarX2, Clock, MapPin, Video } from "lucide-react"
import { Button } from "@/components/ui/button"
import { HostHeader, PublicShell } from "@/components/booking/host-header"
import { CancelBookingButton } from "@/components/booking/cancel-booking"
import { db } from "@/lib/db"
import { formatDateTime, formatDuration } from "@/lib/format"

export const metadata: Metadata = { title: "Votre rendez-vous", robots: { index: false } }

function googleCalendarLink(title: string, start: Date, end: Date, details: string) {
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")
  const p = new URLSearchParams({ action: "TEMPLATE", text: title, dates: `${fmt(start)}/${fmt(end)}`, details })
  return `https://calendar.google.com/calendar/render?${p}`
}

export default async function ManageBookingPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ confirmed?: string }> }) {
  const { token } = await params
  const { confirmed } = await searchParams
  const booking = await db.booking.findUnique({
    where: { manageToken: token },
    include: { service: true, user: { select: { name: true, businessName: true, image: true, timezone: true, slug: true } } },
  })
  if (!booking) notFound()
  const host = booking.user
  const hostName = host.businessName ?? host.name
  const tz = host.timezone
  const cancelled = booking.status === "CANCELLED"
  const past = booking.startAt < new Date()

  return (
    <PublicShell>
      <div className="mx-auto max-w-xl rounded-3xl border border-border bg-card p-6 text-center shadow-xl shadow-primary/5 sm:p-10">
        <span className={`mx-auto grid size-16 place-items-center rounded-full ${cancelled ? "bg-destructive/10 text-destructive" : "bg-success/12 text-success"}`}>
          {cancelled ? <CalendarX2 className="size-8" /> : <CalendarCheck2 className="size-8" />}
        </span>
        <h1 className="mt-5 text-2xl font-bold sm:text-3xl">
          {cancelled ? "Rendez-vous annulé" : confirmed ? "C'est confirmé !" : "Votre rendez-vous"}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {cancelled
            ? "Ce créneau a été libéré."
            : confirmed
              ? `Un e-mail de confirmation a été envoyé à ${booking.clientEmail}.`
              : `Réservé au nom de ${booking.clientName}.`}
        </p>

        <div className="mt-8 rounded-2xl border border-border p-5 text-left">
          <HostHeader name={hostName} image={host.image} subtitle={booking.service.name} />
          <ul className="mt-5 space-y-3 text-sm">
            <li className="flex items-start gap-3">
              <CalendarCheck2 className="mt-0.5 size-4 text-primary" />
              <span className="font-semibold first-letter:uppercase">{formatDateTime(booking.startAt, tz)}</span>
            </li>
            <li className="flex items-center gap-3 text-muted-foreground"><Clock className="size-4 text-primary" />{formatDuration(booking.service.durationMin)} · {tz.replace("_", " ")}</li>
            {booking.meetUrl && !cancelled ? (
              <li className="flex items-center gap-3"><Video className="size-4 text-primary" /><a href={booking.meetUrl} className="font-medium text-primary underline-offset-4 hover:underline" target="_blank" rel="noreferrer">Rejoindre la visio Google Meet</a></li>
            ) : booking.service.location ? (
              <li className="flex items-center gap-3 text-muted-foreground"><MapPin className="size-4 text-primary" />{booking.service.location}</li>
            ) : null}
          </ul>
          {cancelled && booking.cancelReason && <p className="mt-4 rounded-lg bg-muted p-3 text-sm">Motif : {booking.cancelReason}</p>}
        </div>

        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          {!cancelled && !past && (
            <>
              <Button asChild size="lg" variant="outline">
                <a href={googleCalendarLink(`${booking.service.name} — ${hostName}`, booking.startAt, booking.endAt, booking.meetUrl ?? booking.service.location ?? "")} target="_blank" rel="noreferrer">
                  <CalendarPlus className="size-4" /> Ajouter à mon agenda
                </a>
              </Button>
              <CancelBookingButton token={token} />
            </>
          )}
          {(cancelled || past) && host.slug && (
            <Button asChild size="lg">
              <Link href={`/book/${host.slug}`}>Reprendre un rendez-vous</Link>
            </Button>
          )}
        </div>
      </div>
    </PublicShell>
  )
}
