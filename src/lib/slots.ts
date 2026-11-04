import "server-only"
import { addDays, addMinutes } from "date-fns"
import { formatInTimeZone, fromZonedTime } from "date-fns-tz"
import { db } from "@/lib/db"
import { getBusyIntervals } from "@/lib/google-calendar"
import type { Service, User } from "@/lib/generated/prisma/client"

type Interval = { start: Date; end: Date }

const overlaps = (a: Interval, b: Interval) => a.start < b.end && b.start < a.end

/** Date du jour "YYYY-MM-DD" dans le fuseau donné. */
export function todayIn(tz: string) {
  return formatInTimeZone(new Date(), tz, "yyyy-MM-dd")
}

export function isValidDateString(date: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(new Date(`${date}T12:00:00Z`).getTime())
}

/**
 * Créneaux libres pour un service à une date (heure locale du professionnel).
 * Exclut : hors horaires, délai minimum, rendez-vous Agendo existants (+ tampon)
 * et événements occupés du Google Calendar.
 */
export async function getAvailableSlots(
  user: Pick<User, "id" | "timezone" | "calendarId" | "minNoticeMin" | "maxDaysAhead">,
  service: Pick<Service, "durationMin" | "bufferMin">,
  date: string,
): Promise<string[]> {
  if (!isValidDateString(date)) return []
  const tz = user.timezone
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay()

  const windows = await db.availability.findMany({
    where: { userId: user.id, weekday },
    orderBy: { startMin: "asc" },
  })
  if (windows.length === 0) return []

  const dayStart = fromZonedTime(`${date}T00:00:00`, tz)
  const dayEnd = addDays(dayStart, 1)
  const now = new Date()
  const earliest = addMinutes(now, user.minNoticeMin)
  const latest = addDays(now, user.maxDaysAhead)
  if (dayEnd <= earliest || dayStart > latest) return []

  const [bookings, googleBusy] = await Promise.all([
    db.booking.findMany({
      where: { userId: user.id, status: "CONFIRMED", startAt: { lt: dayEnd }, endAt: { gt: addMinutes(dayStart, -240) } },
      select: { startAt: true, endAt: true, service: { select: { bufferMin: true } } },
    }),
    getBusyIntervals(user.id, user.calendarId, dayStart, dayEnd),
  ])

  const busy: Interval[] = [
    ...bookings.map((b) => ({ start: b.startAt, end: addMinutes(b.endAt, b.service.bufferMin) })),
    ...googleBusy,
  ]

  const step = Math.min(30, service.durationMin)
  const slots: string[] = []
  for (const w of windows) {
    for (let m = w.startMin; m + service.durationMin <= w.endMin; m += step) {
      const hh = String(Math.floor(m / 60)).padStart(2, "0")
      const mm = String(m % 60).padStart(2, "0")
      const start = fromZonedTime(`${date}T${hh}:${mm}:00`, tz)
      const block = { start, end: addMinutes(start, service.durationMin + service.bufferMin) }
      if (start < earliest || start > latest) continue
      if (busy.some((b) => overlaps(block, b))) continue
      slots.push(start.toISOString())
    }
  }
  return slots
}
