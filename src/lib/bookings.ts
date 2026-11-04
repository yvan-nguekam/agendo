import "server-only"
import { after } from "next/server"
import { addMinutes } from "date-fns"
import { z } from "zod"
import { db } from "@/lib/db"
import { cancelCalendarEvent, createCalendarEvent } from "@/lib/google-calendar"
import { notifyBookingCancelled, notifyBookingCreated, notifyCalendarError } from "@/lib/notifications"
import { getAvailableSlots } from "@/lib/slots"
import { formatInTimeZone } from "date-fns-tz"

export const bookingInput = z.object({
  serviceId: z.string().min(1),
  startAt: z.iso.datetime(),
  clientName: z.string().trim().min(2, "Nom trop court").max(120),
  clientEmail: z.email("E-mail invalide").max(200),
  clientPhone: z
    .string()
    .trim()
    .max(30)
    .regex(/^[+\d][\d\s.()-]{5,}$/, "Numéro invalide")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  notes: z.string().trim().max(1000).optional(),
})

export type BookingInput = z.infer<typeof bookingInput>

export class BookingError extends Error {}

export async function createBooking(slug: string, input: BookingInput) {
  const host = await db.user.findUnique({ where: { slug } })
  if (!host) throw new BookingError("Professionnel introuvable.")
  const service = await db.service.findFirst({ where: { id: input.serviceId, userId: host.id, active: true } })
  if (!service) throw new BookingError("Prestation indisponible.")

  const start = new Date(input.startAt)
  const date = formatInTimeZone(start, host.timezone, "yyyy-MM-dd")
  const slots = await getAvailableSlots(host, service, date)
  if (!slots.includes(start.toISOString())) {
    throw new BookingError("Ce créneau vient d'être pris. Merci d'en choisir un autre.")
  }
  const end = addMinutes(start, service.durationMin)

  // Transaction sérialisable : deux clients ne peuvent pas prendre le même créneau.
  const booking = await db.$transaction(
    async (tx) => {
      const clash = await tx.booking.findFirst({
        where: {
          userId: host.id,
          status: "CONFIRMED",
          startAt: { lt: addMinutes(end, service.bufferMin) },
          endAt: { gt: start },
        },
        select: { id: true },
      })
      if (clash) throw new BookingError("Ce créneau vient d'être pris. Merci d'en choisir un autre.")
      return tx.booking.create({
        data: {
          userId: host.id,
          serviceId: service.id,
          clientName: input.clientName,
          clientEmail: input.clientEmail.toLowerCase(),
          clientPhone: input.clientPhone || null,
          notes: input.notes || null,
          startAt: start,
          endAt: end,
        },
      })
    },
    { isolationLevel: "Serializable" },
  )

  // Événement Google (avec Meet si demandé) — la réservation reste valide en cas d'échec.
  try {
    const event = await createCalendarEvent({
      userId: host.id,
      calendarId: host.calendarId,
      summary: `${service.name} — ${booking.clientName}`,
      description: [
        `Réservé via Agendo`,
        `Client : ${booking.clientName} <${booking.clientEmail}>`,
        booking.clientPhone ? `Téléphone : ${booking.clientPhone}` : null,
        booking.notes ? `\nNote : ${booking.notes}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
      start,
      end,
      timezone: host.timezone,
      attendeeEmail: booking.clientEmail,
      attendeeName: booking.clientName,
      location: service.location,
      withMeet: service.withMeet,
      requestId: booking.id,
    })
    await db.booking.update({
      where: { id: booking.id },
      data: { googleEventId: event.eventId, meetUrl: event.meetUrl },
    })
  } catch (error) {
    console.error("[booking] google event", error)
    await notifyCalendarError(
      host.id,
      `Le rendez-vous de ${booking.clientName} n'a pas pu être ajouté à Google Calendar. Reconnectez votre compte Google.`,
      booking.id,
    )
  }

  // E-mails / SMS envoyés après la réponse pour garder la réservation rapide
  after(() => notifyBookingCreated(booking.id))
  return booking
}

export async function cancelBooking(bookingId: string, by: "client" | "host", reason?: string) {
  const booking = await db.booking.findUnique({ where: { id: bookingId }, include: { user: true } })
  if (!booking || booking.status !== "CONFIRMED") throw new BookingError("Ce rendez-vous ne peut plus être annulé.")

  await db.booking.update({
    where: { id: booking.id },
    data: { status: "CANCELLED", cancelledBy: by, cancelReason: reason?.trim() || null },
  })
  if (booking.googleEventId) {
    try {
      await cancelCalendarEvent(booking.userId, booking.user.calendarId, booking.googleEventId)
    } catch (error) {
      console.error("[booking] google delete", error)
      await notifyCalendarError(booking.userId, `L'événement de ${booking.clientName} n'a pas pu être retiré de Google Calendar.`, booking.id)
    }
  }
  after(() => notifyBookingCancelled(booking.id, by))
}
