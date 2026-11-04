import "server-only"
import { cache } from "react"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { ensureAccountSetup } from "@/lib/setup"

export const getSession = cache(async () => auth.api.getSession({ headers: await headers() }))

/** Utilisateur connecté (profil complet) ou redirection vers /login. */
export const requireUser = cache(async () => {
  const session = await getSession()
  if (!session) redirect("/login")
  await ensureAccountSetup(session.user.id)
  const user = await db.user.findUnique({ where: { id: session.user.id } })
  if (!user) redirect("/login")
  return user
})
