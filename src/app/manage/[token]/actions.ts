"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { BookingError, cancelBooking } from "@/lib/bookings"

export async function cancelByToken(token: string, reason: string) {
  const booking = await db.booking.findUnique({ where: { manageToken: token }, select: { id: true, startAt: true } })
  if (!booking) return { ok: false as const, error: "Rendez-vous introuvable" }
  if (booking.startAt < new Date()) return { ok: false as const, error: "Ce rendez-vous est déjà passé" }
  try {
    await cancelBooking(booking.id, "client", reason.slice(0, 300))
  } catch (e) {
    return { ok: false as const, error: e instanceof BookingError ? e.message : "Annulation impossible" }
  }
  revalidatePath(`/manage/${token}`)
  return { ok: true as const }
}
