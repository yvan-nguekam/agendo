import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Clock, Globe, MapPin, Video } from "lucide-react"
import { HostHeader, PublicShell } from "@/components/booking/host-header"
import { BookingFlow } from "@/components/booking/booking-flow"
import { db } from "@/lib/db"
import { formatDuration, formatPrice } from "@/lib/format"
import { todayIn } from "@/lib/slots"

type Props = { params: Promise<{ slug: string; serviceId: string }> }

async function load(slug: string, serviceId: string) {
  const host = await db.user.findUnique({
    where: { slug },
    select: { id: true, name: true, businessName: true, image: true, timezone: true, maxDaysAhead: true, availability: { select: { weekday: true } } },
  })
  if (!host) return null
  const service = await db.service.findFirst({ where: { id: serviceId, userId: host.id, active: true } })
  return service ? { host, service } : null
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, serviceId } = await params
  const data = await load(slug, serviceId)
  return { title: data ? `${data.service.name} · ${data.host.businessName ?? data.host.name}` : "Introuvable" }
}

export default async function ServiceBookingPage({ params }: Props) {
  const { slug, serviceId } = await params
  const data = await load(slug, serviceId)
  if (!data) notFound()
  const { host, service } = data
  const name = host.businessName ?? host.name

  return (
    <PublicShell>
      <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-xl shadow-primary/5 lg:grid lg:grid-cols-[300px_1fr]">
        <aside className="border-b border-border p-6 sm:p-8 lg:border-r lg:border-b-0">
          <Link href={`/book/${slug}`} className="mb-6 inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> Toutes les prestations
          </Link>
          <HostHeader name={name} image={host.image} />
          <h1 className="mt-6 text-2xl font-bold">{service.name}</h1>
          {service.description && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{service.description}</p>}
          <ul className="mt-5 space-y-2.5 text-sm text-muted-foreground">
            <li className="flex items-center gap-2"><Clock className="size-4" />{formatDuration(service.durationMin)}</li>
            {service.withMeet ? (
              <li className="flex items-center gap-2"><Video className="size-4" />Visio Google Meet (lien envoyé à la confirmation)</li>
            ) : service.location ? (
              <li className="flex items-center gap-2"><MapPin className="size-4" />{service.location}</li>
            ) : null}
            <li className="flex items-center gap-2"><Globe className="size-4" />Heures affichées : {host.timezone.replace("_", " ")}</li>
            {service.priceCents != null && <li className="text-base font-semibold text-foreground">{formatPrice(service.priceCents, service.currency)}</li>}
          </ul>
        </aside>
        <BookingFlow
          slug={slug}
          serviceId={service.id}
          timezone={host.timezone}
          today={todayIn(host.timezone)}
          maxDaysAhead={host.maxDaysAhead}
          openWeekdays={[...new Set(host.availability.map((a) => a.weekday))]}
        />
      </div>
    </PublicShell>
  )
}
