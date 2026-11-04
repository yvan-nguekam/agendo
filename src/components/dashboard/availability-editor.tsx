"use client"

import { useState, useTransition } from "react"
import { Copy, Loader2, Plus, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { saveAvailability } from "@/app/dashboard/actions"
import { hhmmToMinutes, minutesToHHMM } from "@/lib/format"

type Win = { startMin: number; endMin: number }
const DAYS = [
  { weekday: 1, label: "Lundi" },
  { weekday: 2, label: "Mardi" },
  { weekday: 3, label: "Mercredi" },
  { weekday: 4, label: "Jeudi" },
  { weekday: 5, label: "Vendredi" },
  { weekday: 6, label: "Samedi" },
  { weekday: 0, label: "Dimanche" },
]

const NOTICE = [
  { v: 0, l: "Aucun" }, { v: 60, l: "1 heure" }, { v: 120, l: "2 heures" }, { v: 240, l: "4 heures" },
  { v: 720, l: "12 heures" }, { v: 1440, l: "24 heures" }, { v: 2880, l: "48 heures" },
]
const AHEAD = [7, 14, 30, 60, 90, 180]

export function AvailabilityEditor({
  initial,
  minNoticeMin,
  maxDaysAhead,
  timezone,
}: {
  initial: { weekday: number; startMin: number; endMin: number }[]
  minNoticeMin: number
  maxDaysAhead: number
  timezone: string
}) {
  const [days, setDays] = useState<Record<number, Win[]>>(() => {
    const map: Record<number, Win[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] }
    for (const w of initial) map[w.weekday].push({ startMin: w.startMin, endMin: w.endMin })
    return map
  })
  const [notice, setNotice] = useState(minNoticeMin)
  const [ahead, setAhead] = useState(maxDaysAhead)
  const [pending, start] = useTransition()

  const update = (weekday: number, list: Win[]) => setDays((d) => ({ ...d, [weekday]: list }))

  const save = () =>
    start(async () => {
      const windows = Object.entries(days).flatMap(([wd, list]) => list.map((w) => ({ weekday: Number(wd), ...w })))
      const res = await saveAvailability({ windows, minNoticeMin: notice, maxDaysAhead: ahead })
      if (res.ok) toast.success(res.message)
      else toast.error(res.error)
    })

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <Card>
        <CardHeader>
          <CardTitle>Horaires hebdomadaires</CardTitle>
          <CardDescription>Fuseau : {timezone}. Vos événements Google Calendar sont retirés automatiquement.</CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          {DAYS.map(({ weekday, label }) => {
            const list = days[weekday]
            const open = list.length > 0
            return (
              <div key={weekday} className="flex flex-col gap-3 py-4 first:pt-0 sm:flex-row sm:items-start">
                <div className="flex w-40 items-center gap-3 sm:pt-2">
                  <Switch
                    id={`day-${weekday}`}
                    checked={open}
                    onCheckedChange={(v) => update(weekday, v ? [{ startMin: 540, endMin: 1020 }] : [])}
                  />
                  <Label htmlFor={`day-${weekday}`} className="font-semibold">{label}</Label>
                </div>
                <div className="flex-1 space-y-2">
                  {!open && <p className="text-sm text-muted-foreground sm:pt-2">Fermé</p>}
                  {list.map((w, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <TimeInput label={`${label} début ${i + 1}`} value={w.startMin} onChange={(v) => update(weekday, list.map((x, j) => (j === i ? { ...x, startMin: v } : x)))} />
                      <span className="text-muted-foreground">–</span>
                      <TimeInput label={`${label} fin ${i + 1}`} value={w.endMin} onChange={(v) => update(weekday, list.map((x, j) => (j === i ? { ...x, endMin: v } : x)))} />
                      <Button variant="ghost" size="icon" aria-label="Retirer cette plage" onClick={() => update(weekday, list.filter((_, j) => j !== i))}>
                        <X className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                {open && (
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Ajouter une plage le ${label}`}
                      onClick={() => {
                        const last = list[list.length - 1]
                        const s = Math.min(last ? last.endMin + 60 : 540, 1380)
                        update(weekday, [...list, { startMin: s, endMin: Math.min(s + 120, 1440) }])
                      }}
                    >
                      <Plus className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Copier les horaires du ${label} sur tous les jours ouverts`}
                      title="Appliquer aux autres jours ouverts"
                      onClick={() => {
                        setDays((d) => {
                          const next = { ...d }
                          for (const k of Object.keys(next)) if (next[Number(k)].length) next[Number(k)] = list.map((x) => ({ ...x }))
                          return next
                        })
                        toast.info("Horaires copiés sur les jours ouverts")
                      }}
                    >
                      <Copy className="size-4" />
                    </Button>
                  </div>
                )}
              </div>
            )
          })}
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Règles de réservation</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5">
            <div className="grid gap-2">
              <Label htmlFor="notice">Délai minimum avant un rendez-vous</Label>
              <Select value={String(notice)} onValueChange={(v) => setNotice(Number(v))}>
                <SelectTrigger id="notice" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>{NOTICE.map((n) => <SelectItem key={n.v} value={String(n.v)}>{n.l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ahead">Réservation possible jusqu&apos;à</Label>
              <Select value={String(ahead)} onValueChange={(v) => setAhead(Number(v))}>
                <SelectTrigger id="ahead" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>{AHEAD.map((n) => <SelectItem key={n} value={String(n)}>{n} jours à l&apos;avance</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
        <Button size="lg" className="w-full" onClick={save} disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" />} Enregistrer les disponibilités
        </Button>
      </div>
    </div>
  )
}

function TimeInput({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <input
      type="time"
      step={900}
      aria-label={label}
      value={minutesToHHMM(value % 1440 === 0 && value ? 1439 : value)}
      onChange={(e) => e.target.value && onChange(hhmmToMinutes(e.target.value))}
      className="h-10 w-28 rounded-lg border border-input bg-card px-3 text-sm tabular-nums outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
    />
  )
}
