import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { CalendarSync, BellRing, Link2 } from "lucide-react"
import { Logo } from "@/components/logo"
import { GoogleSignInButton } from "@/components/google-button"
import { getSession } from "@/lib/session"

export const metadata: Metadata = { title: "Connexion" }

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams
  const target = next?.startsWith("/dashboard") ? next : "/dashboard"
  if (await getSession()) redirect(target)

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col px-4 py-8 sm:px-10">
        <Logo />
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
          <h1 className="text-3xl font-bold">Bienvenue</h1>
          <p className="mt-2 text-muted-foreground">
            Connectez-vous avec le compte Google dont vous voulez synchroniser l&apos;agenda.
          </p>
          <GoogleSignInButton next={target} className="mt-8" />
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            Agendo demande l&apos;accès à vos disponibilités et à la création d&apos;événements dans Google Calendar.
            Nous ne lisons jamais le contenu de vos e-mails.
          </p>
        </div>
      </div>
      <div className="relative hidden overflow-hidden bg-primary p-12 text-primary-foreground lg:flex lg:flex-col lg:justify-center">
        <div aria-hidden className="absolute -top-24 -right-24 size-96 rounded-full bg-white/10 blur-3xl" />
        <h2 className="max-w-md text-3xl font-bold leading-tight">Votre agenda se remplit pendant que vous travaillez.</h2>
        <ul className="mt-10 space-y-5">
          {[
            { icon: CalendarSync, text: "Créneaux calculés en direct depuis Google Calendar" },
            { icon: Link2, text: "Une page de réservation à votre nom" },
            { icon: BellRing, text: "Confirmations et rappels e-mail, SMS, WhatsApp" },
          ].map((i) => (
            <li key={i.text} className="flex items-center gap-4">
              <span className="grid size-10 place-items-center rounded-xl bg-white/15"><i.icon className="size-5" /></span>
              <span className="text-primary-foreground/90">{i.text}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
