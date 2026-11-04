"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { addDays, format, parseISO } from "date-fns"
import { fr as dfFr } from "date-fns/locale"
import { formatInTimeZone } from "date-fns-tz"
import { fr } from "react-day-picker/locale"
import { ArrowLeft, CalendarX2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

type Props = {
  slug: string
  serviceId: string
  timezone: string
  today: string
  maxDaysAhead: number
  openWeekdays: number[]
}

export function BookingFlow({ slug, serviceId, timezone, today, maxDaysAhead, openWeekdays }: Props) {
  const router = useRouter()
  const todayDate = useMemo(() => parseISO(today), [today])
  const lastDate = useMemo(() => addDays(todayDate, maxDaysAhead), [todayDate, maxDaysAhead])

  // Premier jour ouvert à partir d'aujourd'hui
  const firstOpen = useMemo(() => {
    for (let i = 0; i <= maxDaysAhead; i++) {
      const d = addDays(todayDate, i)
      if (openWeekdays.includes(d.getDay())) return d
    }
    return undefined
  }, [todayDate, maxDaysAhead, openWeekdays])

  const [date, setDate] = useState<Date | undefined>(firstOpen)
  const [slotState, setSlotState] = useState<{ key: string; slots: string[] } | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [form, setForm] = useState({ clientName: "", clientEmail: "", clientPhone: "", notes: "" })
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({})
  const [submitting, startSubmit] = useTransition()

  const dateKey = date ? format(date, "yyyy-MM-dd") : null
  // Créneaux de la date affichée (null = chargement en cours)
  const slots = slotState && slotState.key === dateKey ? slotState.slots : null
  const setSlots = (update: (list: string[]) => string[]) =>
    setSlotState((st) => (st ? { ...st, slots: update(st.slots) } : st))

  useEffect(() => {
    if (!dateKey) return
    let cancelled = false
    fetch(`/api/public/slots?slug=${encodeURIComponent(slug)}&serviceId=${serviceId}&date=${dateKey}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { slots: [] }))
      .then((d: { slots: string[] }) => !cancelled && setSlotState({ key: dateKey, slots: d.slots }))
      .catch(() => !cancelled && setSlotState({ key: dateKey, slots: [] }))
    return () => {
      cancelled = true
    }
  }, [dateKey, slug, serviceId])

  const groups = useMemo(() => {
    if (!slots) return []
    const parts = [
      { label: "Matin", items: [] as string[] },
      { label: "Après-midi", items: [] as string[] },
      { label: "Soir", items: [] as string[] },
    ]
    for (const s of slots) {
      const h = Number(formatInTimeZone(s, timezone, "H"))
      parts[h < 12 ? 0 : h < 18 ? 1 : 2].items.push(s)
    }
    return parts.filter((p) => p.items.length)
  }, [slots, timezone])

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) return
    startSubmit(async () => {
      const res = await fetch("/api/public/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, serviceId, startAt: selected, ...form }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        router.push(`/manage/${data.manageToken}?confirmed=1`)
        return
      }
      if (res.status === 422) setErrors(data.fields ?? {})
      toast.error(data.error ?? "Réservation impossible")
      if (res.status === 409) {
        setSelected(null)
        setSlots((list) => list.filter((s) => s !== selected))
      }
    })
  }

  // Étape 2 : coordonnées
  if (selected) {
    return (
      <section className="p-6 sm:p-8" aria-labelledby="form-title">
        <button type="button" onClick={() => setSelected(null)} className="mb-6 inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Changer de créneau
        </button>
        <div className="rounded-2xl bg-secondary p-4">
          <p className="text-sm text-secondary-foreground/80">Créneau choisi</p>
          <p className="text-lg font-bold text-secondary-foreground first-letter:uppercase">
            {formatInTimeZone(selected, timezone, "EEEE d MMMM 'à' HH:mm", { locale: dfFr })}
          </p>
        </div>
        <h2 id="form-title" className="mt-8 text-xl font-bold">Vos coordonnées</h2>
        <form onSubmit={submit} className="mt-4 grid gap-4" noValidate>
          <Field id="clientName" label="Nom complet" error={errors.clientName}>
            <Input id="clientName" autoComplete="name" required value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} aria-invalid={!!errors.clientName} />
          </Field>
          <Field id="clientEmail" label="E-mail" error={errors.clientEmail} hint="La confirmation vous sera envoyée ici.">
            <Input id="clientEmail" type="email" autoComplete="email" required value={form.clientEmail} onChange={(e) => setForm({ ...form, clientEmail: e.target.value })} aria-invalid={!!errors.clientEmail} />
          </Field>
          <Field id="clientPhone" label="Téléphone (facultatif)" error={errors.clientPhone} hint="Pour recevoir les rappels par SMS ou WhatsApp.">
            <Input id="clientPhone" type="tel" inputMode="tel" autoComplete="tel" placeholder="+33 6 12 34 56 78" value={form.clientPhone} onChange={(e) => setForm({ ...form, clientPhone: e.target.value })} aria-invalid={!!errors.clientPhone} />
          </Field>
          <Field id="notes" label="Message (facultatif)" error={errors.notes}>
            <Textarea id="notes" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Précisions utiles pour le rendez-vous" />
          </Field>
          <Button type="submit" size="lg" disabled={submitting} className="mt-2 bg-cta text-cta-foreground hover:bg-cta/90">
            {submitting && <Loader2 className="size-4 animate-spin" />} Confirmer le rendez-vous
          </Button>
        </form>
      </section>
    )
  }

  // Étape 1 : date + créneau
  return (
    <section className="grid gap-6 p-6 sm:p-8 md:grid-cols-[auto_1fr]" aria-label="Choix du créneau">
      <div>
        <h2 className="mb-3 text-lg font-bold">Choisissez une date</h2>
        <Calendar
          mode="single"
          locale={fr}
          selected={date}
          onSelect={(d) => {
            if (!d) return
            setDate(d)
            setSelected(null)
          }}
          startMonth={todayDate}
          endMonth={lastDate}
          defaultMonth={firstOpen ?? todayDate}
          disabled={[{ before: todayDate }, { after: lastDate }, (d: Date) => !openWeekdays.includes(d.getDay())]}
          showOutsideDays={false}
          className="rounded-2xl border border-border bg-card p-3 [--cell-size:--spacing(10)]"
        />
      </div>
      <div className="min-w-0">
        <h2 className="mb-3 text-lg font-bold first-letter:uppercase">
          {date ? format(date, "EEEE d MMMM", { locale: dfFr }) : "Créneaux"}
        </h2>
        <div aria-live="polite">
          {!date ? (
            <p className="text-muted-foreground">Sélectionnez une date.</p>
          ) : slots === null ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-11 rounded-xl" />)}
            </div>
          ) : slots.length === 0 ? (
            <div className="flex flex-col items-center rounded-2xl border border-dashed border-border px-6 py-10 text-center">
              <CalendarX2 className="size-7 text-muted-foreground" />
              <p className="mt-3 font-semibold">Plus de créneau ce jour-là</p>
              <p className="text-sm text-muted-foreground">Essayez une autre date.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {groups.map((g) => (
                <div key={g.label}>
                  <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{g.label}</p>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-3 xl:grid-cols-4">
                    {g.items.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSelected(s)}
                        className={cn(
                          "h-11 rounded-xl border border-primary/30 text-sm font-semibold text-primary tabular-nums transition-all duration-150",
                          "hover:border-primary hover:bg-primary hover:text-primary-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                        )}
                      >
                        {formatInTimeZone(s, timezone, "HH:mm")}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function Field({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string[]; children: React.ReactNode }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error?.length ? <p className="text-sm text-destructive" role="alert">{error[0]}</p> : hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}
