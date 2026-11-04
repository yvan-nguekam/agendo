import "server-only"
import { Resend } from "resend"
import twilio from "twilio"
import { db } from "@/lib/db"
import type { Channel } from "@/lib/generated/prisma/client"

type DeliveryMeta = { bookingId?: string; template: string; hostUserId?: string }

let resend: Resend | null = null
function getResend() {
  if (!process.env.RESEND_API_KEY) return null
  resend ??= new Resend(process.env.RESEND_API_KEY)
  return resend
}

let twilioClient: ReturnType<typeof twilio> | null = null
function getTwilio() {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) return null
  twilioClient ??= twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  return twilioClient
}

async function log(channel: Channel, recipient: string, meta: DeliveryMeta, status: "SENT" | "FAILED" | "SKIPPED", error?: string) {
  await db.notificationDelivery.create({
    data: { channel, recipient, template: meta.template, bookingId: meta.bookingId, status, error },
  })
  // Échec d'envoi → alerte dans la cloche du professionnel
  if (status === "FAILED" && meta.hostUserId) {
    await db.notification.create({
      data: {
        userId: meta.hostUserId,
        type: "DELIVERY_FAILED",
        title: `Échec d'envoi ${channel === "EMAIL" ? "e-mail" : channel === "SMS" ? "SMS" : "WhatsApp"}`,
        body: `Le message « ${meta.template} » à ${recipient} n'a pas pu être envoyé : ${error ?? "erreur inconnue"}`,
        bookingId: meta.bookingId,
      },
    })
  }
}

export async function sendEmail(to: string, subject: string, html: string, meta: DeliveryMeta) {
  const client = getResend()
  if (!client) {
    console.info(`[email:dev] → ${to} — ${subject}`)
    return log("EMAIL", to, meta, "SKIPPED", "RESEND_API_KEY manquant")
  }
  try {
    const { error } = await client.emails.send({
      from: process.env.EMAIL_FROM || "Agendo <onboarding@resend.dev>",
      to,
      subject,
      html,
    })
    if (error) throw new Error(error.message)
    await log("EMAIL", to, meta, "SENT")
  } catch (e) {
    await log("EMAIL", to, meta, "FAILED", (e as Error).message)
  }
}

/** Numéro au format E.164 (+33612345678). */
export function normalizePhone(phone: string) {
  const cleaned = phone.replace(/[^\d+]/g, "")
  if (cleaned.startsWith("00")) return `+${cleaned.slice(2)}`
  return cleaned
}

export async function sendSms(to: string, body: string, meta: DeliveryMeta) {
  return sendTwilio("SMS", normalizePhone(to), body, meta)
}

export async function sendWhatsapp(to: string, body: string, meta: DeliveryMeta) {
  return sendTwilio("WHATSAPP", normalizePhone(to), body, meta)
}

async function sendTwilio(channel: "SMS" | "WHATSAPP", to: string, body: string, meta: DeliveryMeta) {
  const client = getTwilio()
  const from = channel === "SMS" ? process.env.TWILIO_SMS_FROM : process.env.TWILIO_WHATSAPP_FROM
  if (!client || !from) {
    console.info(`[${channel.toLowerCase()}:dev] → ${to} — ${body}`)
    return log(channel, to, meta, "SKIPPED", "Twilio non configuré")
  }
  try {
    await client.messages.create(
      channel === "SMS"
        ? { from, to, body }
        : { from: from.startsWith("whatsapp:") ? from : `whatsapp:${from}`, to: `whatsapp:${to}`, body },
    )
    await log(channel, to, meta, "SENT")
  } catch (e) {
    await log(channel, to, meta, "FAILED", (e as Error).message)
  }
}
