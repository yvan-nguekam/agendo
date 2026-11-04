import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowRight, Clock, MapPin, Video } from "lucide-react"
import { HostHeader, PublicShell } from "@/components/booking/host-header"
import { db } from "@/lib/db"
import { formatDuration, formatPrice } from "@/lib/format"

type Props = { params: Promise<{ slug: string }> }

async function load(slug: string) {
  return db.user.findUnique({
    where: { slug },
    select: { id: true, name: true, businessName: true, image: true, services: { where: { active: true }, orderBy: { createdAt: "asc" } } },
  })
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const host = await load((await params).slug)
  return { title: host ? `Prendre rendez-vous avec ${host.businessName ?? host.name}` : "Introuvable" }
}

export default async function HostBookingPage({ params }: Props) {
  const { slug } = await params
  const host = await load(slug)
  if (!host) notFound()
  const name = host.businessName ?? host.name

  return (
    <PublicShell>
      <div className="rounded-3xl border border-border bg-card p-6 shadow-xl shadow-primary/5 sm:p-10">
        <HostHeader name={name} image={host.image} subtitle="Choisissez une prestation pour voir les créneaux disponibles" />
        <div className="mt-8 grid gap-3">
          {host.services.length === 0 && <p className="rounded-xl bg-muted p-6 text-center text-muted-foreground">Aucune prestation n&apos;est réservable pour le moment.</p>}
          {host.services.map((s) => (
            <Link
              key={s.id}
              href={`/book/${slug}/${s.id}`}
              className="group flex items-center gap-4 rounded-2xl border border-border p-5 transition-all duration-200 hover:border-primary/40 hover:bg-secondary/40 hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <span className="h-12 w-1.5 shrink-0 rounded-full" style={{ background: s.color }} />
              <div className="min-w-0 flex-1">
                <p className="text-lg font-semibold">{s.name}</p>
                {s.description && <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{s.description}</p>}
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5"><Clock className="size-4" />{formatDuration(s.durationMin)}</span>
                  {s.withMeet ? <span className="inline-flex items-center gap-1.5"><Video className="size-4" />Visio Google Meet</span> : s.location ? <span className="inline-flex items-center gap-1.5"><MapPin className="size-4" />{s.location}</span> : null}
                  {s.priceCents != null && <span className="font-semibold text-foreground">{formatPrice(s.priceCents, s.currency)}</span>}
                </div>
              </div>
              <ArrowRight className="size-5 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
            </Link>
          ))}
        </div>
      </div>
    </PublicShell>
  )
}
