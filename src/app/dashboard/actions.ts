"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { db } from "@/lib/db"
import { requireUser } from "@/lib/session"
import { BookingError, cancelBooking } from "@/lib/bookings"
import { sendEmail, sendSms, sendWhatsapp } from "@/lib/notifications/channels"
import { emailLayout } from "@/lib/notifications/templates"
import { slugify } from "@/lib/format"

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string }

const fail = (error: string): ActionResult => ({ ok: false, error })

// ─── Prestations ───────────────────────────────────────────────────────────

const serviceSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Nom trop court").max(80),
  description: z.string().trim().max(500).optional(),
  durationMin: z.coerce.number().int().min(5).max(480),
  bufferMin: z.coerce.number().int().min(0).max(240),
  price: z.string().trim().optional(),
  currency: z.string().length(3).default("EUR"),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#1d4ed8"),
  location: z.string().trim().max(200).optional(),
  withMeet: z.boolean().default(false),
  active: z.boolean().default(true),
})

export async function saveService(input: z.input<typeof serviceSchema>): Promise<ActionResult> {
  const user = await requireUser()
  const parsed = serviceSchema.safeParse(input)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Formulaire invalide")
  const { id, price, ...data } = parsed.data
  const priceCents = price ? Math.round(Number(price.replace(",", ".")) * 100) : null
  if (priceCents != null && (Number.isNaN(priceCents) || priceCents < 0)) return fail("Prix invalide")

  const values = { ...data, description: data.description || null, location: data.location || null, priceCents }
  if (id) {
    const res = await db.service.updateMany({ where: { id, userId: user.id }, data: values })
    if (!res.count) return fail("Prestation introuvable")
  } else {
    await db.service.create({ data: { ...values, userId: user.id } })
  }
  revalidatePath("/dashboard/services")
  return { ok: true, message: id ? "Prestation mise à jour" : "Prestation créée" }
}

export async function deleteService(id: string): Promise<ActionResult> {
  const user = await requireUser()
  const used = await db.booking.count({ where: { serviceId: id, userId: user.id } })
  if (used) {
    await db.service.updateMany({ where: { id, userId: user.id }, data: { active: false } })
    revalidatePath("/dashboard/services")
    return { ok: true, message: "Prestation désactivée (des rendez-vous y sont liés)" }
  }
  await db.service.deleteMany({ where: { id, userId: user.id } })
  revalidatePath("/dashboard/services")
  return { ok: true, message: "Prestation supprimée" }
}

// ─── Disponibilités ────────────────────────────────────────────────────────

const windowSchema = z
  .object({ weekday: z.number().int().min(0).max(6), startMin: z.number().int().min(0).max(1440), endMin: z.number().int().min(0).max(1440) })
  .refine((w) => w.endMin > w.startMin, "L'heure de fin doit suivre l'heure de début")

const availabilitySchema = z.object({
  windows: z.array(windowSchema).max(70),
  minNoticeMin: z.number().int().min(0).max(60 * 24 * 14),
  maxDaysAhead: z.number().int().min(1).max(365),
})

export async function saveAvailability(input: z.input<typeof availabilitySchema>): Promise<ActionResult> {
  const user = await requireUser()
  const parsed = availabilitySchema.safeParse(input)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Horaires invalides")

  const byDay = new Map<number, { startMin: number; endMin: number }[]>()
  for (const w of parsed.data.windows) byDay.set(w.weekday, [...(byDay.get(w.weekday) ?? []), w])
  for (const list of byDay.values()) {
    list.sort((a, b) => a.startMin - b.startMin)
    for (let i = 1; i < list.length; i++) if (list[i].startMin < list[i - 1].endMin) return fail("Deux plages se chevauchent")
  }

  await db.$transaction([
    db.availability.deleteMany({ where: { userId: user.id } }),
    db.availability.createMany({ data: parsed.data.windows.map((w) => ({ ...w, userId: user.id })) }),
    db.user.update({
      where: { id: user.id },
      data: { minNoticeMin: parsed.data.minNoticeMin, maxDaysAhead: parsed.data.maxDaysAhead },
    }),
  ])
  revalidatePath("/dashboard/availability")
  return { ok: true, message: "Disponibilités enregistrées" }
}

// ─── Rendez-vous ───────────────────────────────────────────────────────────

export async function cancelBookingAction(id: string, reason?: string): Promise<ActionResult> {
  const user = await requireUser()
  const booking = await db.booking.findFirst({ where: { id, userId: user.id }, select: { id: true } })
  if (!booking) return fail("Rendez-vous introuvable")
  try {
    await cancelBooking(booking.id, "host", reason)
  } catch (e) {
    return fail(e instanceof BookingError ? e.message : "Annulation impossible")
  }
  revalidatePath("/dashboard", "layout")
  return { ok: true, message: "Rendez-vous annulé, le client est prévenu" }
}

export async function setBookingStatus(id: string, status: "COMPLETED" | "NO_SHOW"): Promise<ActionResult> {
  const user = await requireUser()
  const res = await db.booking.updateMany({ where: { id, userId: user.id, status: { in: ["CONFIRMED", "COMPLETED", "NO_SHOW"] } }, data: { status } })
  if (!res.count) return fail("Rendez-vous introuvable")
  revalidatePath("/dashboard", "layout")
  return { ok: true, message: status === "COMPLETED" ? "Marqué comme honoré" : "Marqué comme absent" }
}

// ─── Paramètres ────────────────────────────────────────────────────────────

const profileSchema = z.object({
  businessName: z.string().trim().min(2).max(80),
  slug: z.string().trim().min(3, "Lien trop court").max(40),
  timezone: z.string().refine((tz) => {
    try {
      new Intl.DateTimeFormat("fr", { timeZone: tz })
      return true
    } catch {
      return false
    }
  }, "Fuseau horaire invalide"),
  phone: z.string().trim().max(30).optional(),
})

export async function saveProfile(input: z.input<typeof profileSchema>): Promise<ActionResult> {
  const user = await requireUser()
  const parsed = profileSchema.safeParse(input)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Formulaire invalide")
  const slug = slugify(parsed.data.slug)
  if (slug.length < 3) return fail("Lien trop court")
  const taken = await db.user.findFirst({ where: { slug, NOT: { id: user.id } }, select: { id: true } })
  if (taken) return fail("Ce lien est déjà utilisé")
  await db.user.update({
    where: { id: user.id },
    data: { ...parsed.data, slug, phone: parsed.data.phone || null },
  })
  revalidatePath("/dashboard", "layout")
  return { ok: true, message: "Profil enregistré" }
}

const prefsSchema = z.object({
  clientEmail: z.boolean(),
  clientSms: z.boolean(),
  clientWhatsapp: z.boolean(),
  hostEmail: z.boolean(),
  hostSms: z.boolean(),
  hostWhatsapp: z.boolean(),
  remind24h: z.boolean(),
  remind1h: z.boolean(),
})

export async function savePreferences(input: z.input<typeof prefsSchema>): Promise<ActionResult> {
  const user = await requireUser()
  const parsed = prefsSchema.safeParse(input)
  if (!parsed.success) return fail("Préférences invalides")
  if ((parsed.data.hostSms || parsed.data.hostWhatsapp) && !user.phone) {
    return fail("Ajoutez votre numéro dans le profil pour recevoir les alertes SMS / WhatsApp")
  }
  await db.notificationPreference.upsert({
    where: { userId: user.id },
    update: parsed.data,
    create: { ...parsed.data, userId: user.id },
  })
  revalidatePath("/dashboard/settings")
  return { ok: true, message: "Notifications enregistrées" }
}

export async function sendTestNotification(channel: "EMAIL" | "SMS" | "WHATSAPP"): Promise<ActionResult> {
  const user = await requireUser()
  const meta = { template: "Test", hostUserId: user.id }
  if (channel === "EMAIL") {
    await sendEmail(
      user.email,
      "Test de notification Agendo",
      emailLayout({ preheader: "Test", title: "Tout fonctionne !", intro: "Vos e-mails Agendo sont bien configurés." }),
      meta,
    )
  } else {
    if (!user.phone) return fail("Ajoutez d'abord votre numéro de téléphone")
    const send = channel === "SMS" ? sendSms : sendWhatsapp
    await send(user.phone, "Agendo : test de notification réussi.", meta)
  }
  const last = await db.notificationDelivery.findFirst({ where: { template: "Test" }, orderBy: { createdAt: "desc" } })
  if (last?.status === "FAILED") return fail(`Échec : ${last.error}`)
  if (last?.status === "SKIPPED") return { ok: true, message: `Mode dev : ${last.error} (message affiché dans la console)` }
  return { ok: true, message: "Message de test envoyé" }
}
