import "server-only"
import { db } from "@/lib/db"
import { appUrl, formatDateTime } from "@/lib/format"
import { sendEmail, sendSms, sendWhatsapp } from "./channels"
import { templates, type BookingView } from "./templates"

async function loadBooking(bookingId: string) {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { service: true, user: { include: { preferences: true } } },
  })
  if (!booking) return null
  const view: BookingView = {
    clientName: booking.clientName,
    clientEmail: booking.clientEmail,
    clientPhone: booking.clientPhone,
    notes: booking.notes,
    startAt: booking.startAt,
    meetUrl: booking.meetUrl,
    serviceName: booking.service.name,
    durationMin: booking.service.durationMin,
    location: booking.service.location,
    hostName: booking.user.businessName || booking.user.name,
    timezone: booking.user.timezone,
    manageUrl: appUrl(`/manage/${booking.manageToken}`),
    cancelReason: booking.cancelReason,
  }
  const prefs = booking.user.preferences ?? {
    clientEmail: true, clientSms: false, clientWhatsapp: false,
    hostEmail: true, hostSms: false, hostWhatsapp: false,
    remind24h: true, remind1h: true,
  }
  return { booking, view, prefs, host: booking.user }
}

type Message = { subject: string; html: string; text: string }

async function toClient(ctx: NonNullable<Awaited<ReturnType<typeof loadBooking>>>, msg: Message, template: string) {
  const meta = { bookingId: ctx.booking.id, template, hostUserId: ctx.host.id }
  const jobs: Promise<unknown>[] = []
  if (ctx.prefs.clientEmail) jobs.push(sendEmail(ctx.view.clientEmail, msg.subject, msg.html, meta))
  if (ctx.view.clientPhone) {
    if (ctx.prefs.clientSms) jobs.push(sendSms(ctx.view.clientPhone, msg.text, meta))
    if (ctx.prefs.clientWhatsapp) jobs.push(sendWhatsapp(ctx.view.clientPhone, msg.text, meta))
  }
  await Promise.allSettled(jobs)
}

async function toHost(ctx: NonNullable<Awaited<ReturnType<typeof loadBooking>>>, msg: Message, template: string) {
  const meta = { bookingId: ctx.booking.id, template, hostUserId: ctx.host.id }
  const jobs: Promise<unknown>[] = []
  if (ctx.prefs.hostEmail) jobs.push(sendEmail(ctx.host.email, msg.subject, msg.html, meta))
  if (ctx.host.phone) {
    if (ctx.prefs.hostSms) jobs.push(sendSms(ctx.host.phone, msg.text, meta))
    if (ctx.prefs.hostWhatsapp) jobs.push(sendWhatsapp(ctx.host.phone, msg.text, meta))
  }
  await Promise.allSettled(jobs)
}

export async function notifyBookingCreated(bookingId: string) {
  const ctx = await loadBooking(bookingId)
  if (!ctx) return
  const when = formatDateTime(ctx.booking.startAt, ctx.view.timezone, "EEEE d MMMM 'à' HH:mm")
  await db.notification.create({
    data: {
      userId: ctx.host.id,
      type: "BOOKING_CREATED",
      title: "Nouveau rendez-vous",
      body: `${ctx.view.clientName} — ${ctx.view.serviceName}, ${when}`,
      bookingId,
    },
  })
  await Promise.allSettled([
    toClient(ctx, templates.clientConfirmation(ctx.view), "Confirmation client"),
    toHost(ctx, templates.hostNewBooking(ctx.view, appUrl("/dashboard/bookings")), "Alerte nouvelle réservation"),
  ])
}

export async function notifyBookingCancelled(bookingId: string, by: "client" | "host") {
  const ctx = await loadBooking(bookingId)
  if (!ctx) return
  const when = formatDateTime(ctx.booking.startAt, ctx.view.timezone, "EEEE d MMMM 'à' HH:mm")
  await db.notification.create({
    data: {
      userId: ctx.host.id,
      type: "BOOKING_CANCELLED",
      title: by === "client" ? "Annulation client" : "Rendez-vous annulé",
      body: `${ctx.view.clientName} — ${ctx.view.serviceName}, ${when}`,
      bookingId,
    },
  })
  const jobs = [toClient(ctx, templates.clientCancelled(ctx.view), "Annulation client")]
  if (by === "client") jobs.push(toHost(ctx, templates.hostCancelled(ctx.view, appUrl("/dashboard/bookings")), "Alerte annulation"))
  await Promise.allSettled(jobs)
}

export async function notifyReminder(bookingId: string, when: "24h" | "1h") {
  const ctx = await loadBooking(bookingId)
  if (!ctx || ctx.booking.status !== "CONFIRMED") return
  await toClient(ctx, templates.clientReminder(ctx.view, when), `Rappel ${when}`)
  if (when === "1h") {
    await db.notification.create({
      data: {
        userId: ctx.host.id,
        type: "BOOKING_REMINDER",
        title: "Rendez-vous dans 1 heure",
        body: `${ctx.view.clientName} — ${ctx.view.serviceName} à ${formatDateTime(ctx.booking.startAt, ctx.view.timezone, "HH:mm")}`,
        bookingId,
      },
    })
  }
}

export async function notifyCalendarError(userId: string, message: string, bookingId?: string) {
  await db.notification.create({
    data: { userId, type: "CALENDAR_SYNC_ERROR", title: "Synchronisation Google Calendar", body: message, bookingId },
  })
}
