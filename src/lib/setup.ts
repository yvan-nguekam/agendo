import "server-only"
import { db } from "@/lib/db"
import { slugify } from "@/lib/format"

/**
 * Premier passage d'un compte : lien public, horaires lun-ven 9h-12h / 14h-18h,
 * un service par défaut et les préférences de notification.
 */
export async function ensureAccountSetup(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { slug: true, name: true, email: true, preferences: { select: { userId: true } } },
  })
  if (!user || (user.slug && user.preferences)) return

  if (!user.slug) {
    const base = slugify(user.name || user.email.split("@")[0]) || "pro"
    let slug = base
    for (let i = 2; await db.user.findUnique({ where: { slug }, select: { id: true } }); i++) {
      slug = `${base}-${i}`
    }
    await db.$transaction([
      db.user.update({ where: { id: userId }, data: { slug, businessName: user.name } }),
      db.availability.createMany({
        data: [1, 2, 3, 4, 5].flatMap((weekday) => [
          { userId, weekday, startMin: 9 * 60, endMin: 12 * 60 },
          { userId, weekday, startMin: 14 * 60, endMin: 18 * 60 },
        ]),
      }),
      db.service.create({
        data: {
          userId,
          name: "Consultation",
          description: "Premier échange de 30 minutes.",
          durationMin: 30,
          withMeet: true,
          location: "Google Meet",
        },
      }),
    ])
  }

  await db.notificationPreference.upsert({ where: { userId }, update: {}, create: { userId } })
}
