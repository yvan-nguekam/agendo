"use client"

import { useState, useTransition } from "react"
import { Loader2, Mail, MessageCircle, Send, Smartphone } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { savePreferences, saveProfile, sendTestNotification } from "@/app/dashboard/actions"

const TIMEZONES = [
  "Europe/Paris", "Europe/Brussels", "Europe/Zurich", "Europe/London", "Africa/Abidjan", "Africa/Dakar",
  "Africa/Douala", "Africa/Casablanca", "Africa/Tunis", "Africa/Algiers", "Africa/Kinshasa", "Indian/Reunion",
  "America/Martinique", "America/Guadeloupe", "America/Montreal", "America/New_York", "UTC",
]

export function ProfileForm({ initial }: { initial: { businessName: string; slug: string; timezone: string; phone: string } }) {
  const [v, setV] = useState(initial)
  const [pending, start] = useTransition()
  const tzList = TIMEZONES.includes(v.timezone) ? TIMEZONES : [v.timezone, ...TIMEZONES]
  return (
    <Card>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          start(async () => {
            const res = await saveProfile(v)
            if (res.ok) toast.success(res.message)
            else toast.error(res.error)
          })
        }}
        className="flex flex-col gap-6"
      >
        <CardHeader>
          <CardTitle>Profil public</CardTitle>
          <CardDescription>Ce que vos clients voient sur votre page de réservation.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="businessName">Nom affiché</Label>
            <Input id="businessName" value={v.businessName} onChange={(e) => setV({ ...v, businessName: e.target.value })} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="slug">Lien de réservation</Label>
            <div className="flex h-10 items-center rounded-lg border border-input bg-card focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
              <span className="pl-3 text-sm text-muted-foreground">/book/</span>
              <input id="slug" value={v.slug} onChange={(e) => setV({ ...v, slug: e.target.value })} className="h-full min-w-0 flex-1 bg-transparent pr-3 text-sm outline-none" required />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="timezone">Fuseau horaire</Label>
            <Select value={v.timezone} onValueChange={(timezone) => setV({ ...v, timezone })}>
              <SelectTrigger id="timezone" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{tzList.map((tz) => <SelectItem key={tz} value={tz}>{tz.replace("_", " ")}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="phone">Votre mobile (alertes SMS / WhatsApp)</Label>
            <Input id="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="+33 6 12 34 56 78" value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} />
          </div>
        </CardContent>
        <CardFooter className="justify-end border-t border-border pt-4">
          <Button type="submit" disabled={pending}>{pending && <Loader2 className="size-4 animate-spin" />} Enregistrer</Button>
        </CardFooter>
      </form>
    </Card>
  )
}

type Prefs = {
  clientEmail: boolean; clientSms: boolean; clientWhatsapp: boolean
  hostEmail: boolean; hostSms: boolean; hostWhatsapp: boolean
  remind24h: boolean; remind1h: boolean
}

export function PreferencesForm({ initial, providers }: { initial: Prefs; providers: { email: boolean; sms: boolean; whatsapp: boolean } }) {
  const [p, setP] = useState(initial)
  const [pending, start] = useTransition()
  const [testing, setTesting] = useState<string | null>(null)
  const toggle = (k: keyof Prefs) => (v: boolean) => setP((s) => ({ ...s, [k]: v }))

  const channels = [
    { key: "Email", icon: Mail, label: "E-mail", ok: providers.email, test: "EMAIL" as const },
    { key: "Sms", icon: Smartphone, label: "SMS", ok: providers.sms, test: "SMS" as const },
    { key: "Whatsapp", icon: MessageCircle, label: "WhatsApp", ok: providers.whatsapp, test: "WHATSAPP" as const },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notifications & rappels</CardTitle>
        <CardDescription>Choisissez qui est prévenu, et par quel canal.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="pb-3 font-medium">Canal</th>
                <th className="pb-3 text-center font-medium">Client<span className="block text-xs font-normal">confirmations, rappels</span></th>
                <th className="pb-3 text-center font-medium">Vous<span className="block text-xs font-normal">nouvelles résa, annulations</span></th>
                <th className="pb-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {channels.map((c) => (
                <tr key={c.key}>
                  <td className="py-3">
                    <span className="flex items-center gap-2 font-medium"><c.icon className="size-4 text-primary" />{c.label}</span>
                    {!c.ok && <span className="text-xs text-warning">Non configuré (.env)</span>}
                  </td>
                  <td className="py-3 text-center">
                    <Switch aria-label={`${c.label} pour le client`} checked={p[`client${c.key}` as keyof Prefs]} onCheckedChange={toggle(`client${c.key}` as keyof Prefs)} />
                  </td>
                  <td className="py-3 text-center">
                    <Switch aria-label={`${c.label} pour vous`} checked={p[`host${c.key}` as keyof Prefs]} onCheckedChange={toggle(`host${c.key}` as keyof Prefs)} />
                  </td>
                  <td className="py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={testing !== null}
                      onClick={async () => {
                        setTesting(c.test)
                        const res = await sendTestNotification(c.test)
                        setTesting(null)
                        if (res.ok) toast.success(res.message)
                        else toast.error(res.error)
                      }}
                    >
                      {testing === c.test ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />} Tester
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="-mt-2 text-xs text-muted-foreground">SMS et WhatsApp sont envoyés au client uniquement s&apos;il renseigne son numéro lors de la réservation.</p>

        <div className="grid gap-3 rounded-xl border border-border p-4">
          <p className="font-semibold">Rappels automatiques au client</p>
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="r24">24 heures avant</Label>
            <Switch id="r24" checked={p.remind24h} onCheckedChange={toggle("remind24h")} />
          </div>
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="r1">1 heure avant <span className="font-normal text-muted-foreground">(+ alerte dans votre cloche)</span></Label>
            <Switch id="r1" checked={p.remind1h} onCheckedChange={toggle("remind1h")} />
          </div>
        </div>
      </CardContent>
      <CardFooter className="justify-end border-t border-border pt-4">
        <Button
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await savePreferences(p)
              if (res.ok) toast.success(res.message)
              else toast.error(res.error)
            })
          }
        >
          {pending && <Loader2 className="size-4 animate-spin" />} Enregistrer
        </Button>
      </CardFooter>
    </Card>
  )
}
