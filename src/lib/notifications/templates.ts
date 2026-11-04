import { formatDateTime, formatDuration } from "@/lib/format"

const BRAND = "#1d4ed8"
const CTA = "#ea580c"

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!)

type Row = [label: string, value: string]

export function emailLayout(opts: {
  preheader: string
  title: string
  intro: string
  rows?: Row[]
  cta?: { label: string; url: string; tone?: "brand" | "cta" }
  footer?: string
}) {
  const rows = (opts.rows ?? [])
    .map(
      ([l, v]) =>
        `<tr><td style="padding:8px 0;color:#64748b;font-size:14px;width:120px;vertical-align:top">${esc(l)}</td><td style="padding:8px 0;color:#0f172a;font-size:14px;font-weight:600">${v}</td></tr>`,
    )
    .join("")
  const cta = opts.cta
    ? `<a href="${opts.cta.url}" style="display:inline-block;margin-top:24px;background:${opts.cta.tone === "cta" ? CTA : BRAND};color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:10px">${esc(opts.cta.label)}</a>`
    : ""
  return `<!doctype html><html lang="fr"><body style="margin:0;background:#f1f5f9;font-family:'Plus Jakarta Sans',Segoe UI,Arial,sans-serif">
<span style="display:none;max-height:0;overflow:hidden">${esc(opts.preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden">
<tr><td style="background:${BRAND};padding:20px 28px;color:#fff;font-size:18px;font-weight:700;letter-spacing:-0.01em">Agendo</td></tr>
<tr><td style="padding:28px">
<h1 style="margin:0 0 8px;font-size:22px;color:#0f172a;letter-spacing:-0.02em">${esc(opts.title)}</h1>
<p style="margin:0 0 16px;color:#334155;font-size:15px;line-height:1.6">${opts.intro}</p>
${rows ? `<table role="presentation" width="100%" style="border-top:1px solid #e2e8f0;margin-top:8px">${rows}</table>` : ""}
${cta}
</td></tr>
<tr><td style="padding:16px 28px;background:#f8fafc;color:#64748b;font-size:12px;line-height:1.5">${opts.footer ?? "Cet e-mail a été envoyé automatiquement par Agendo."}</td></tr>
</table></td></tr></table></body></html>`
}

export type BookingView = {
  clientName: string
  clientEmail: string
  clientPhone: string | null
  notes: string | null
  startAt: Date
  meetUrl: string | null
  serviceName: string
  durationMin: number
  location: string | null
  hostName: string
  timezone: string
  manageUrl: string
  cancelReason?: string | null
}

function bookingRows(b: BookingView): Row[] {
  const rows: Row[] = [
    ["Prestation", esc(b.serviceName)],
    ["Date", esc(formatDateTime(b.startAt, b.timezone))],
    ["Durée", esc(formatDuration(b.durationMin))],
  ]
  if (b.meetUrl) rows.push(["Visio", `<a href="${b.meetUrl}" style="color:${BRAND}">${esc(b.meetUrl)}</a>`])
  else if (b.location) rows.push(["Lieu", esc(b.location)])
  return rows
}

export const templates = {
  clientConfirmation: (b: BookingView) => ({
    subject: `Rendez-vous confirmé — ${formatDateTime(b.startAt, b.timezone, "d MMM 'à' HH:mm")}`,
    html: emailLayout({
      preheader: `Votre rendez-vous avec ${b.hostName} est confirmé.`,
      title: "Votre rendez-vous est confirmé",
      intro: `Bonjour ${esc(b.clientName)}, votre rendez-vous avec <strong>${esc(b.hostName)}</strong> est bien enregistré.`,
      rows: bookingRows(b),
      cta: { label: "Gérer ou annuler", url: b.manageUrl },
      footer: "Vous recevrez un rappel avant le rendez-vous. Empêchement ? Annulez via le lien ci-dessus.",
    }),
    text: `Agendo : RDV confirmé avec ${b.hostName} le ${formatDateTime(b.startAt, b.timezone, "dd/MM 'à' HH:mm")} (${b.serviceName}). Gérer : ${b.manageUrl}`,
  }),

  clientReminder: (b: BookingView, when: "24h" | "1h") => ({
    subject: when === "24h" ? `Rappel : rendez-vous demain à ${formatDateTime(b.startAt, b.timezone, "HH:mm")}` : `Rappel : rendez-vous dans 1 heure`,
    html: emailLayout({
      preheader: `Rappel de votre rendez-vous avec ${b.hostName}.`,
      title: when === "24h" ? "C'est demain !" : "Votre rendez-vous approche",
      intro: `Bonjour ${esc(b.clientName)}, petit rappel de votre rendez-vous avec <strong>${esc(b.hostName)}</strong>.`,
      rows: bookingRows(b),
      cta: b.meetUrl ? { label: "Rejoindre la visio", url: b.meetUrl, tone: "cta" } : { label: "Gérer le rendez-vous", url: b.manageUrl },
    }),
    text: `Rappel Agendo : RDV avec ${b.hostName} ${when === "24h" ? "demain" : "dans 1h"} à ${formatDateTime(b.startAt, b.timezone, "HH:mm")}.${b.meetUrl ? ` Visio : ${b.meetUrl}` : ""} Gérer : ${b.manageUrl}`,
  }),

  clientCancelled: (b: BookingView) => ({
    subject: "Rendez-vous annulé",
    html: emailLayout({
      preheader: "Votre rendez-vous a été annulé.",
      title: "Rendez-vous annulé",
      intro: `Bonjour ${esc(b.clientName)}, votre rendez-vous avec <strong>${esc(b.hostName)}</strong> a été annulé.${b.cancelReason ? `<br/>Motif : ${esc(b.cancelReason)}` : ""}`,
      rows: bookingRows(b),
    }),
    text: `Agendo : votre RDV du ${formatDateTime(b.startAt, b.timezone, "dd/MM 'à' HH:mm")} avec ${b.hostName} est annulé.`,
  }),

  hostNewBooking: (b: BookingView, dashboardUrl: string) => ({
    subject: `Nouveau rendez-vous : ${b.clientName} — ${formatDateTime(b.startAt, b.timezone, "d MMM HH:mm")}`,
    html: emailLayout({
      preheader: `${b.clientName} a réservé ${b.serviceName}.`,
      title: "Nouvelle réservation",
      intro: `<strong>${esc(b.clientName)}</strong> vient de réserver un créneau. L'événement a été ajouté à votre Google Calendar.`,
      rows: [
        ...bookingRows(b),
        ["Client", `${esc(b.clientEmail)}${b.clientPhone ? `<br/>${esc(b.clientPhone)}` : ""}`],
        ...(b.notes ? ([["Note", esc(b.notes)]] as Row[]) : []),
      ],
      cta: { label: "Voir dans Agendo", url: dashboardUrl },
    }),
    text: `Agendo : nouveau RDV ${b.clientName} le ${formatDateTime(b.startAt, b.timezone, "dd/MM 'à' HH:mm")} (${b.serviceName}).`,
  }),

  hostCancelled: (b: BookingView, dashboardUrl: string) => ({
    subject: `Annulation : ${b.clientName} — ${formatDateTime(b.startAt, b.timezone, "d MMM HH:mm")}`,
    html: emailLayout({
      preheader: `${b.clientName} a annulé son rendez-vous.`,
      title: "Rendez-vous annulé par le client",
      intro: `<strong>${esc(b.clientName)}</strong> a annulé son rendez-vous. Le créneau est de nouveau disponible.${b.cancelReason ? `<br/>Motif : ${esc(b.cancelReason)}` : ""}`,
      rows: bookingRows(b),
      cta: { label: "Ouvrir Agendo", url: dashboardUrl },
    }),
    text: `Agendo : ${b.clientName} a annulé son RDV du ${formatDateTime(b.startAt, b.timezone, "dd/MM 'à' HH:mm")}.`,
  }),
}
