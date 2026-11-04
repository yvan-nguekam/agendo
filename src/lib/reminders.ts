import "server-only"
import { addHours } from "date-fns"
import { db } from "@/lib/db"
import { notifyReminder } from "@/lib/notifications"

const HOUR = 60 * 60 * 1000

/**
 * Envoie les rappels 24 h et 1 h. Appelé par le cron (/api/cron/reminders).
 * Chaque rappel est "réservé" par un updateMany conditionnel avant l'envoi :
 * deux exécutions simultanées n'envoient jamais deux fois le même rappel.
 */
export async function runReminders(now = new Date()) {
  const result = { sent24h: 0, sent1h: 0 }

  const due24 = await db.booking.findMany({
    where: {
      status: "CONFIRMED",
      reminder24hAt: null,
      startAt: { gt: addHours(now, 1), lte: addHours(now, 24) },
      user: { preferences: { remind24h: true } },
    },
    select: { id: true, startAt: true, createdAt: true },
  })
  for (const b of due24) {
    // Réservé moins de 24 h avant : la confirmation suffit
    if (b.startAt.getTime() - b.createdAt.getTime() < 24 * HOUR) continue
    const claimed = await db.booking.updateMany({ where: { id: b.id, reminder24hAt: null }, data: { reminder24hAt: now } })
    if (claimed.count) {
      await notifyReminder(b.id, "24h")
      result.sent24h++
    }
  }

  const due1 = await db.booking.findMany({
    where: {
      status: "CONFIRMED",
      reminder1hAt: null,
      startAt: { gt: now, lte: addHours(now, 1) },
      user: { preferences: { remind1h: true } },
    },
    select: { id: true, startAt: true, createdAt: true },
  })
  for (const b of due1) {
    if (b.startAt.getTime() - b.createdAt.getTime() < HOUR) continue
    const claimed = await db.booking.updateMany({ where: { id: b.id, reminder1hAt: null }, data: { reminder1hAt: now } })
    if (claimed.count) {
      await notifyReminder(b.id, "1h")
      result.sent1h++
    }
  }

  // Rendez-vous passés → terminés
  await db.booking.updateMany({
    where: { status: "CONFIRMED", endAt: { lt: addHours(now, -2) } },
    data: { status: "COMPLETED" },
  })
  return result
}
