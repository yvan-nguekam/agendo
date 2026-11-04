"use client"

import { useState, useTransition } from "react"
import { Loader2, Pencil, Plus } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { saveService } from "@/app/dashboard/actions"
import { cn } from "@/lib/utils"

export type ServiceValues = {
  id?: string
  name: string
  description: string
  durationMin: number
  bufferMin: number
  price: string
  currency: string
  color: string
  location: string
  withMeet: boolean
  active: boolean
}

const COLORS = ["#1d4ed8", "#0891b2", "#059669", "#ea580c", "#db2777", "#7c3aed", "#475569"]
const DURATIONS = [15, 20, 30, 45, 60, 90, 120]

const EMPTY: ServiceValues = {
  name: "",
  description: "",
  durationMin: 30,
  bufferMin: 0,
  price: "",
  currency: "EUR",
  color: COLORS[0],
  location: "",
  withMeet: false,
  active: true,
}

export function ServiceDialog({ initial }: { initial?: ServiceValues }) {
  const [open, setOpen] = useState(false)
  const [values, setValues] = useState<ServiceValues>(initial ?? EMPTY)
  const [pending, start] = useTransition()
  const set = <K extends keyof ServiceValues>(k: K, v: ServiceValues[K]) => setValues((s) => ({ ...s, [k]: v }))

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (o) setValues(initial ?? EMPTY)
      }}
    >
      <DialogTrigger asChild>
        {initial ? (
          <Button variant="ghost" size="icon" aria-label={`Modifier ${initial.name}`}><Pencil className="size-4" /></Button>
        ) : (
          <Button><Plus className="size-4" /> Nouvelle prestation</Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? "Modifier la prestation" : "Nouvelle prestation"}</DialogTitle>
          <DialogDescription>Ce que vos clients pourront réserver.</DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            start(async () => {
              const res = await saveService(values)
              if (res.ok) {
                toast.success(res.message)
                setOpen(false)
              } else toast.error(res.error)
            })
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor="s-name">Nom</Label>
            <Input id="s-name" required value={values.name} onChange={(e) => set("name", e.target.value)} placeholder="Ex. : Consultation découverte" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="s-desc">Description</Label>
            <Textarea id="s-desc" value={values.description} onChange={(e) => set("description", e.target.value)} placeholder="Ce qui est inclus, comment se préparer…" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="s-duration">Durée</Label>
              <Select value={String(values.durationMin)} onValueChange={(v) => set("durationMin", Number(v))}>
                <SelectTrigger id="s-duration" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DURATIONS.map((d) => <SelectItem key={d} value={String(d)}>{d < 60 ? `${d} min` : `${d / 60} h`}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="s-buffer">Pause après</Label>
              <Select value={String(values.bufferMin)} onValueChange={(v) => set("bufferMin", Number(v))}>
                <SelectTrigger id="s-buffer" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[0, 5, 10, 15, 30].map((d) => <SelectItem key={d} value={String(d)}>{d ? `${d} min` : "Aucune"}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-[1fr_110px] gap-4">
            <div className="grid gap-2">
              <Label htmlFor="s-price">Prix (facultatif)</Label>
              <Input id="s-price" inputMode="decimal" value={values.price} onChange={(e) => set("price", e.target.value)} placeholder="Ex. : 45" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="s-currency">Devise</Label>
              <Select value={values.currency} onValueChange={(v) => set("currency", v)}>
                <SelectTrigger id="s-currency" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["EUR", "XOF", "XAF", "MAD", "CAD", "USD", "CHF"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-between gap-4 rounded-xl border border-border p-4">
            <div>
              <Label htmlFor="s-meet">Lien Google Meet automatique</Label>
              <p className="text-sm text-muted-foreground">Une visio est créée pour chaque rendez-vous.</p>
            </div>
            <Switch id="s-meet" checked={values.withMeet} onCheckedChange={(v) => set("withMeet", v)} />
          </div>
          {!values.withMeet && (
            <div className="grid gap-2">
              <Label htmlFor="s-location">Lieu</Label>
              <Input id="s-location" value={values.location} onChange={(e) => set("location", e.target.value)} placeholder="Adresse, ou « Par téléphone »" />
            </div>
          )}
          <fieldset className="grid gap-2">
            <legend className="mb-2 text-sm font-medium">Couleur</legend>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => set("color", c)}
                  aria-label={`Couleur ${c}`}
                  aria-pressed={values.color === c}
                  className={cn("size-9 rounded-full ring-offset-2 ring-offset-background transition-shadow", values.color === c && "ring-2 ring-foreground")}
                  style={{ background: c }}
                />
              ))}
            </div>
          </fieldset>
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="s-active">Réservable en ligne</Label>
            <Switch id="s-active" checked={values.active} onCheckedChange={(v) => set("active", v)} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending} className="w-full sm:w-auto">
              {pending && <Loader2 className="size-4 animate-spin" />} Enregistrer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
