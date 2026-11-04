import "server-only"
import { google, type calendar_v3 } from "googleapis"
import { db } from "@/lib/db"

/** Client Google Calendar authentifié avec le compte Google du professionnel. */
export async function getCalendarClient(userId: string): Promise<calendar_v3.Calendar | null> {
  const account = await db.account.findFirst({ where: { userId, providerId: "google" } })
  if (!account?.refreshToken && !account?.accessToken) return null

  const oauth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET)
  oauth.setCredentials({
    access_token: account.accessToken ?? undefined,
    refresh_token: account.refreshToken ?? undefined,
    expiry_date: account.accessTokenExpiresAt?.getTime(),
  })
  // googleapis rafraîchit le jeton tout seul : on persiste le nouveau
  oauth.on("tokens", (tokens) => {
    void db.account
      .update({
        where: { id: account.id },
        data: {
          accessToken: tokens.access_token ?? undefined,
          accessTokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
          ...(tokens.refresh_token ? { refreshToken: tokens.refresh_token } : {}),
        },
      })
      .catch(() => {})
  })
  return google.calendar({ version: "v3", auth: oauth })
}

export async function getCalendarStatus(userId: string) {
  const account = await db.account.findFirst({
    where: { userId, providerId: "google" },
    select: { scope: true, refreshToken: true },
  })
  const scopes = account?.scope ?? ""
  return {
    connected: Boolean(account?.refreshToken),
    canWrite: scopes.includes("calendar.events") || scopes.includes("auth/calendar "),
  }
}

/** Intervalles occupés dans Google Calendar (événements existants du pro). */
export async function getBusyIntervals(userId: string, calendarId: string, timeMin: Date, timeMax: Date) {
  const calendar = await getCalendarClient(userId)
  if (!calendar) return []
  try {
    const res = await calendar.freebusy.query({
      requestBody: { timeMin: timeMin.toISOString(), timeMax: timeMax.toISOString(), items: [{ id: calendarId }] },
    })
    const busy = res.data.calendars?.[calendarId]?.busy ?? []
    return busy
      .filter((b) => b.start && b.end)
      .map((b) => ({ start: new Date(b.start!), end: new Date(b.end!) }))
  } catch (error) {
    console.error("[google] freebusy", error)
    return []
  }
}

type EventInput = {
  userId: string
  calendarId: string
  summary: string
  description: string
  start: Date
  end: Date
  timezone: string
  attendeeEmail: string
  attendeeName: string
  location?: string | null
  withMeet: boolean
  requestId: string
}

export async function createCalendarEvent(input: EventInput) {
  const calendar = await getCalendarClient(input.userId)
  if (!calendar) throw new Error("Google Calendar n'est pas connecté.")
  const res = await calendar.events.insert({
    calendarId: input.calendarId,
    conferenceDataVersion: input.withMeet ? 1 : 0,
    sendUpdates: "none", // Agendo envoie ses propres confirmations
    requestBody: {
      summary: input.summary,
      description: input.description,
      location: input.withMeet ? undefined : input.location ?? undefined,
      start: { dateTime: input.start.toISOString(), timeZone: input.timezone },
      end: { dateTime: input.end.toISOString(), timeZone: input.timezone },
      attendees: [{ email: input.attendeeEmail, displayName: input.attendeeName }],
      reminders: { useDefault: false, overrides: [{ method: "popup", minutes: 15 }] },
      conferenceData: input.withMeet
        ? { createRequest: { requestId: input.requestId, conferenceSolutionKey: { type: "hangoutsMeet" } } }
        : undefined,
      extendedProperties: { private: { agendoBookingId: input.requestId } },
    },
  })
  return { eventId: res.data.id ?? null, meetUrl: res.data.hangoutLink ?? null }
}

export async function cancelCalendarEvent(userId: string, calendarId: string, eventId: string) {
  const calendar = await getCalendarClient(userId)
  if (!calendar) return
  try {
    await calendar.events.delete({ calendarId, eventId, sendUpdates: "none" })
  } catch (error) {
    const status = (error as { code?: number }).code
    if (status !== 404 && status !== 410) throw error
  }
}

/** Prochains événements Google (affichage du tableau de bord). */
export async function listUpcomingEvents(userId: string, calendarId: string, max = 6) {
  const calendar = await getCalendarClient(userId)
  if (!calendar) return null
  try {
    const res = await calendar.events.list({
      calendarId,
      timeMin: new Date().toISOString(),
      maxResults: max,
      singleEvents: true,
      orderBy: "startTime",
    })
    return (res.data.items ?? []).map((e) => ({
      id: e.id!,
      summary: e.summary ?? "(Sans titre)",
      start: e.start?.dateTime ?? e.start?.date ?? null,
      allDay: !e.start?.dateTime,
      link: e.htmlLink ?? null,
      fromAgendo: Boolean(e.extendedProperties?.private?.agendoBookingId),
    }))
  } catch (error) {
    console.error("[google] events.list", error)
    return null
  }
}
