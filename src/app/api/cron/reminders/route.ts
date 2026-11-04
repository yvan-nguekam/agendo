import { NextResponse, type NextRequest } from "next/server"
import { runReminders } from "@/lib/reminders"

export const maxDuration = 60

/** Planifié par vercel.json (ou tout cron externe) avec `Authorization: Bearer $CRON_SECRET`. */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }
  const result = await runReminders()
  return NextResponse.json({ ok: true, ...result })
}
