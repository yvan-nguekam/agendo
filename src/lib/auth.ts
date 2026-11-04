import "server-only"
import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { nextCookies } from "better-auth/next-js"
import { db } from "@/lib/db"

/** Scopes Google Calendar : lecture des disponibilités + création d'événements. */
export const GOOGLE_CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.freebusy",
]

export const auth = betterAuth({
  database: prismaAdapter(db, { provider: "postgresql" }),
  trustedOrigins: process.env.BETTER_AUTH_TRUSTED_ORIGINS?.split(",")
    .map((o) => o.trim())
    .filter(Boolean),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      scope: GOOGLE_CALENDAR_SCOPES,
      // refresh_token indispensable pour synchroniser l'agenda hors session
      accessType: "offline",
      prompt: "select_account consent",
    },
  },
  account: {
    accountLinking: { enabled: true, trustedProviders: ["google"] },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  plugins: [nextCookies()],
})

export type AuthSession = typeof auth.$Infer.Session
