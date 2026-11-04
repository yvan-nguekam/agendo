import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { BookingError, bookingInput, createBooking } from "@/lib/bookings"

const body = bookingInput.extend({ slug: z.string().min(1) })

export async function POST(request: NextRequest) {
  const parsed = body.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Formulaire invalide", fields: z.flattenError(parsed.error).fieldErrors },
      { status: 422 },
    )
  }
  const { slug, ...input } = parsed.data
  try {
    const booking = await createBooking(slug, input)
    return NextResponse.json({ id: booking.id, manageToken: booking.manageToken }, { status: 201 })
  } catch (error) {
    if (error instanceof BookingError) return NextResponse.json({ error: error.message }, { status: 409 })
    console.error("[api] booking", error)
    return NextResponse.json({ error: "Une erreur est survenue. Réessayez." }, { status: 500 })
  }
}
