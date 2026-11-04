import { Clock, Layers, MapPin, Video } from "lucide-react"
import { Card } from "@/components/ui/card"
import { PageHeader } from "@/components/dashboard/page-header"
import { ServiceDialog } from "@/components/dashboard/service-form"
import { DeleteServiceButton } from "@/components/dashboard/delete-service"
import { CopyLinkButton } from "@/components/dashboard/copy-link"
import { db } from "@/lib/db"
import { requireUser } from "@/lib/session"
import { formatDuration, formatPrice } from "@/lib/format"

export const metadata = { title: "Prestations" }

export default async function ServicesPage() {
  const user = await requireUser()
  const services = await db.service.findMany({ where: { userId: user.id }, orderBy: [{ active: "desc" }, { createdAt: "asc" }] })

  return (
    <>
      <PageHeader title="Prestations" description="Les types de rendez-vous proposés sur votre page.">
        <ServiceDialog />
      </PageHeader>

      {services.length === 0 ? (
        <Card className="items-center px-6 py-16 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-secondary text-primary"><Layers className="size-6" /></span>
          <p className="font-semibold">Aucune prestation</p>
          <p className="text-sm text-muted-foreground">Créez-en une pour commencer à recevoir des réservations.</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {services.map((s) => (
            <Card key={s.id} className={`relative gap-0 overflow-hidden py-0 ${s.active ? "" : "opacity-60"}`}>
              <div className="h-1.5" style={{ background: s.color }} />
              <div className="flex items-start gap-3 p-5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate text-lg font-semibold">{s.name}</h2>
                    {!s.active && <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">Masquée</span>}
                  </div>
                  {s.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{s.description}</p>}
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5"><Clock className="size-4" />{formatDuration(s.durationMin)}{s.bufferMin ? ` + ${s.bufferMin} min` : ""}</span>
                    {s.withMeet ? (
                      <span className="inline-flex items-center gap-1.5"><Video className="size-4" />Google Meet</span>
                    ) : s.location ? (
                      <span className="inline-flex items-center gap-1.5"><MapPin className="size-4" />{s.location}</span>
                    ) : null}
                    {s.priceCents != null && <span className="font-semibold text-foreground">{formatPrice(s.priceCents, s.currency)}</span>}
                  </div>
                </div>
                <div className="flex shrink-0">
                  <ServiceDialog
                    initial={{
                      id: s.id,
                      name: s.name,
                      description: s.description ?? "",
                      durationMin: s.durationMin,
                      bufferMin: s.bufferMin,
                      price: s.priceCents != null ? String(s.priceCents / 100) : "",
                      currency: s.currency,
                      color: s.color,
                      location: s.location ?? "",
                      withMeet: s.withMeet,
                      active: s.active,
                    }}
                  />
                  <DeleteServiceButton id={s.id} name={s.name} />
                </div>
              </div>
              {s.active && user.slug && (
                <div className="border-t border-border bg-muted/40 px-5 py-3">
                  <CopyLinkButton path={`/book/${user.slug}/${s.id}`} label="Copier le lien direct" />
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </>
  )
}
