import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { getSession } from "@/lib/session"

const body = z.object({ ids: z.array(z.string()).max(100).optional(), all: z.boolean().optional() })

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
  const parsed = body.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: "Requête invalide" }, { status: 400 })

  await db.notification.updateMany({
    where: {
      userId: session.user.id,
      readAt: null,
      ...(parsed.data.all ? {} : { id: { in: parsed.data.ids ?? [] } }),
    },
    data: { readAt: new Date() },
  })
  return NextResponse.json({ ok: true })
}
