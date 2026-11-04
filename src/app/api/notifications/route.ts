import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSession } from "@/lib/session"

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
  const [items, unread] = await Promise.all([
    db.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 15,
      select: { id: true, type: true, title: true, body: true, readAt: true, createdAt: true, bookingId: true },
    }),
    db.notification.count({ where: { userId: session.user.id, readAt: null } }),
  ])
  return NextResponse.json({ items, unread }, { headers: { "Cache-Control": "no-store" } })
}
