import { NextResponse, type NextRequest } from "next/server"
import { db } from "@/lib/db"
import { getAvailableSlots, isValidDateString } from "@/lib/slots"

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const slug = searchParams.get("slug") ?? ""
  const serviceId = searchParams.get("serviceId") ?? ""
  const date = searchParams.get("date") ?? ""
  if (!slug || !serviceId || !isValidDateString(date)) {
    return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 })
  }
  const host = await db.user.findUnique({ where: { slug } })
  const service = host && (await db.service.findFirst({ where: { id: serviceId, userId: host.id, active: true } }))
  if (!host || !service) return NextResponse.json({ error: "Introuvable" }, { status: 404 })

  const slots = await getAvailableSlots(host, service, date)
  return NextResponse.json({ slots, timezone: host.timezone }, { headers: { "Cache-Control": "no-store" } })
}
