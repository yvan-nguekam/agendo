import Link from "next/link"
import { ArrowRight, BellRing, CalendarCheck2, CalendarSync, Clock4, Link2, MessageCircle, ShieldCheck, Smartphone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/logo"
import { getSession } from "@/lib/session"

const features = [
  {
    icon: CalendarSync,
    title: "Synchronisé avec Google Calendar",
    text: "Vos événements Google bloquent automatiquement les créneaux. Chaque réservation y est ajoutée, avec lien Google Meet si besoin.",
  },
  {
    icon: Link2,
    title: "Votre page de réservation",
    text: "Un lien unique à partager : vos clients choisissent une prestation et un créneau libre en moins d'une minute.",
  },
  {
    icon: BellRing,
    title: "Alertes en temps réel",
    text: "Nouvelle réservation, annulation, échec d'envoi : tout arrive dans votre cloche de notifications et par e-mail.",
  },
  {
    icon: MessageCircle,
    title: "Rappels SMS & WhatsApp",
    text: "Rappels automatiques 24 h et 1 h avant, par e-mail, SMS ou WhatsApp. Moins d'oublis, moins de rendez-vous manqués.",
  },
  {
    icon: Clock4,
    title: "Horaires sur mesure",
    text: "Plusieurs plages par jour, délai de prévenance, temps tampon entre deux rendez-vous et fenêtre de réservation.",
  },
  {
    icon: ShieldCheck,
    title: "Zéro double réservation",
    text: "Chaque créneau est vérifié en temps réel contre votre agenda et les autres réservations avant confirmation.",
  },
]

const steps = [
  { n: "1", title: "Connectez Google", text: "Connexion en un clic, Agendo lit vos disponibilités." },
  { n: "2", title: "Définissez vos prestations", text: "Durée, prix, lieu ou visio, horaires d'ouverture." },
  { n: "3", title: "Partagez votre lien", text: "Les clients réservent, vous et eux êtes notifiés." },
]

export default async function HomePage() {
  const session = await getSession()
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav className="flex items-center gap-2">
            <Link href="#fonctionnalites" className="hidden rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:block">
              Fonctionnalités
            </Link>
            {session ? (
              <Button asChild>
                <Link href="/dashboard">Tableau de bord</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost">
                  <Link href="/login">Se connecter</Link>
                </Button>
                <Button asChild className="bg-cta text-cta-foreground hover:bg-cta/90">
                  <Link href="/login">Essayer gratuitement</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,color-mix(in_oklab,var(--primary)_14%,transparent),transparent)]" />
          <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pt-16 pb-20 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:pt-24">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
                <CalendarCheck2 className="size-3.5" /> Connecté à Google Calendar
              </span>
              <h1 className="mt-5 text-4xl font-extrabold leading-[1.1] text-foreground sm:text-5xl lg:text-6xl">
                Vos rendez-vous,
                <br />
                <span className="text-primary">sans aller-retour.</span>
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
                Partagez votre page de réservation, Agendo propose uniquement vos créneaux réellement libres, ajoute
                l&apos;événement à votre agenda et envoie confirmations et rappels automatiquement.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="bg-cta text-cta-foreground shadow-lg shadow-cta/25 hover:bg-cta/90">
                  <Link href={session ? "/dashboard" : "/login"}>
                    Créer ma page de réservation <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="bg-card">
                  <Link href="#comment">Comment ça marche</Link>
                </Button>
              </div>
              <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><ShieldCheck className="size-4 text-success" /> Sans carte bancaire</li>
                <li className="flex items-center gap-2"><Smartphone className="size-4 text-success" /> Parfait sur mobile</li>
                <li className="flex items-center gap-2"><BellRing className="size-4 text-success" /> Rappels automatiques</li>
              </ul>
            </div>

            <HeroPreview />
          </div>
        </section>

        {/* Features */}
        <section id="fonctionnalites" className="border-t border-border/60 bg-card py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-bold sm:text-4xl">Tout ce qu&apos;il faut pour remplir votre agenda</h2>
              <p className="mt-3 text-lg text-muted-foreground">Pensé pour les indépendants, cabinets, salons et équipes de service.</p>
            </div>
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f) => (
                <article key={f.title} className="group rounded-2xl border border-border bg-background p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
                  <span className="grid size-11 place-items-center rounded-xl bg-secondary text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <f.icon className="size-5" />
                  </span>
                  <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
                  <p className="mt-2 leading-relaxed text-muted-foreground">{f.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Steps */}
        <section id="comment" className="py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="text-center text-3xl font-bold sm:text-4xl">Prêt en 3 minutes</h2>
            <ol className="mt-12 grid gap-6 md:grid-cols-3">
              {steps.map((s) => (
                <li key={s.n} className="relative rounded-2xl border border-border bg-card p-6">
                  <span className="grid size-10 place-items-center rounded-full bg-primary text-base font-bold text-primary-foreground">{s.n}</span>
                  <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
                  <p className="mt-1 text-muted-foreground">{s.text}</p>
                </li>
              ))}
            </ol>
            <div className="mt-14 rounded-3xl bg-primary px-6 py-12 text-center text-primary-foreground sm:px-12">
              <h2 className="text-3xl font-bold">Arrêtez de jongler entre messages et agenda</h2>
              <p className="mx-auto mt-3 max-w-xl text-primary-foreground/85">Connectez votre Google Calendar et recevez votre première réservation aujourd&apos;hui.</p>
              <Button asChild size="lg" className="mt-8 bg-cta text-cta-foreground hover:bg-cta/90">
                <Link href={session ? "/dashboard" : "/login"}>Commencer gratuitement <ArrowRight className="size-4" /></Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <Logo className="text-foreground" />
          <p>© {new Date().getFullYear()} Agendo. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  )
}

function HeroPreview() {
  const days = ["Lun 9", "Mar 10", "Mer 11", "Jeu 12", "Ven 13"]
  const slots = ["09:00", "09:30", "10:30", "11:00", "14:00", "15:30"]
  return (
    <div className="relative mx-auto w-full max-w-md" aria-hidden>
      <div className="rounded-3xl border border-border bg-card p-6 shadow-2xl shadow-primary/10">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-full bg-secondary text-sm font-bold text-primary">CM</div>
          <div>
            <p className="text-sm text-muted-foreground">Cabinet Martin</p>
            <p className="font-semibold">Consultation · 30 min</p>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-5 gap-2">
          {days.map((d, i) => (
            <div key={d} className={`rounded-xl border px-1 py-2 text-center text-xs font-semibold ${i === 2 ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}>
              {d}
            </div>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {slots.map((s, i) => (
            <div key={s} className={`rounded-lg border py-2 text-center text-sm font-semibold ${i === 3 ? "border-cta bg-cta text-cta-foreground" : "border-primary/25 text-primary"}`}>
              {s}
            </div>
          ))}
        </div>
        <div className="mt-5 rounded-xl bg-muted p-3 text-sm">
          <p className="font-semibold">Mercredi 11 à 11:00</p>
          <p className="text-muted-foreground">Ajouté à Google Calendar · Rappel SMS la veille</p>
        </div>
      </div>
      <div className="absolute -right-3 -bottom-6 flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-xl sm:-right-8">
        <span className="grid size-9 place-items-center rounded-full bg-cta/15 text-cta"><BellRing className="size-4" /></span>
        <div className="text-sm">
          <p className="font-semibold">Nouveau rendez-vous</p>
          <p className="text-muted-foreground">Sophie L. · demain 11:00</p>
        </div>
      </div>
    </div>
  )
}
