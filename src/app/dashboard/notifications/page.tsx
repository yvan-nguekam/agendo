import { formatDistanceToNow } from "date-fns"
import { fr } from "date-fns/locale"
import { Bell, CheckCircle2, Mail, MessageCircle, Smartphone, XCircle, MinusCircle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/components/dashboard/page-header"
import { MarkAllReadButton } from "@/components/dashboard/mark-all-read"
import { NOTIF_STYLE } from "@/components/dashboard/notification-bell"
import { db } from "@/lib/db"
import { requireUser } from "@/lib/session"
import { formatDateTime } from "@/lib/format"
import { cn } from "@/lib/utils"

export const metadata = { title: "Notifications" }

const CHANNEL = { EMAIL: { icon: Mail, label: "E-mail" }, SMS: { icon: Smartphone, label: "SMS" }, WHATSAPP: { icon: MessageCircle, label: "WhatsApp" } }
const DELIVERY = {
  SENT: { icon: CheckCircle2, label: "Envoyé", className: "text-success" },
  FAILED: { icon: XCircle, label: "Échec", className: "text-destructive" },
  SKIPPED: { icon: MinusCircle, label: "Non configuré", className: "text-muted-foreground" },
}

export default async function NotificationsPage() {
  const user = await requireUser()
  const [items, deliveries] = await Promise.all([
    db.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 50 }),
    db.notificationDelivery.findMany({
      where: { OR: [{ booking: { userId: user.id } }, { bookingId: null, recipient: { in: [user.email, user.phone ?? "-"] } }] },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ])
  const unread = items.filter((i) => !i.readAt).length

  return (
    <>
      <PageHeader title="Notifications" description="Alertes de votre compte et journal des messages envoyés.">
        {unread > 0 && <MarkAllReadButton />}
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Card className="gap-0 pb-0">
          <CardHeader className="pb-4">
            <CardTitle>Alertes</CardTitle>
            <CardDescription>{unread ? `${unread} non lue${unread > 1 ? "s" : ""}` : "Tout est à jour"}</CardDescription>
          </CardHeader>
          {items.length === 0 ? (
            <CardContent className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
              <Bell className="size-6" /> Aucune alerte.
            </CardContent>
          ) : (
            <ul className="divide-y divide-border border-t border-border">
              {items.map((n) => {
                const style = NOTIF_STYLE[n.type]
                return (
                  <li key={n.id} className={cn("flex gap-3 px-6 py-4", !n.readAt && "bg-secondary/40")}>
                    <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg", style.className)}><style.icon className="size-4" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 font-semibold">
                        {n.title}
                        {!n.readAt && <span className="size-2 rounded-full bg-cta" aria-label="non lue" />}
                      </p>
                      <p className="text-sm text-muted-foreground">{n.body}</p>
                    </div>
                    <time className="shrink-0 text-xs text-muted-foreground" dateTime={n.createdAt.toISOString()} title={formatDateTime(n.createdAt, user.timezone)}>
                      {formatDistanceToNow(n.createdAt, { addSuffix: true, locale: fr })}
                    </time>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>

        <Card className="gap-0 pb-0">
          <CardHeader className="pb-4">
            <CardTitle>Messages envoyés</CardTitle>
            <CardDescription>Confirmations, rappels et alertes (30 derniers)</CardDescription>
          </CardHeader>
          {deliveries.length === 0 ? (
            <CardContent className="py-12 text-center text-sm text-muted-foreground">Aucun envoi pour l&apos;instant.</CardContent>
          ) : (
            <ul className="divide-y divide-border border-t border-border">
              {deliveries.map((d) => {
                const ch = CHANNEL[d.channel]
                const st = DELIVERY[d.status]
                return (
                  <li key={d.id} className="flex items-start gap-3 px-6 py-3">
                    <ch.icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-label={ch.label} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{d.template}</p>
                      <p className="truncate text-xs text-muted-foreground">{d.recipient} · {formatDateTime(d.createdAt, user.timezone, "d MMM HH:mm")}</p>
                      {d.error && d.status === "FAILED" && <p className="mt-0.5 line-clamp-2 text-xs text-destructive">{d.error}</p>}
                    </div>
                    <span className={cn("inline-flex shrink-0 items-center gap-1 text-xs font-semibold", st.className)}><st.icon className="size-3.5" />{st.label}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
      </div>
    </>
  )
}
