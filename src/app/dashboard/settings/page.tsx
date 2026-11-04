import { CheckCircle2, AlertTriangle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/components/dashboard/page-header"
import { PreferencesForm, ProfileForm } from "@/components/dashboard/settings-forms"
import { GoogleSignInButton } from "@/components/google-button"
import { db } from "@/lib/db"
import { requireUser } from "@/lib/session"
import { getCalendarStatus } from "@/lib/google-calendar"

export const metadata = { title: "Paramètres" }

export default async function SettingsPage() {
  const user = await requireUser()
  const [prefs, calendar] = await Promise.all([
    db.notificationPreference.findUnique({ where: { userId: user.id } }),
    getCalendarStatus(user.id),
  ])
  const providers = {
    email: Boolean(process.env.RESEND_API_KEY),
    sms: Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_SMS_FROM),
    whatsapp: Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_WHATSAPP_FROM),
  }

  return (
    <>
      <PageHeader title="Paramètres" description="Profil, agenda connecté et notifications." />
      <div className="grid gap-6">
        <ProfileForm initial={{ businessName: user.businessName ?? user.name, slug: user.slug ?? "", timezone: user.timezone, phone: user.phone ?? "" }} />

        <Card>
          <CardHeader>
            <CardTitle>Google Calendar</CardTitle>
            <CardDescription>Agenda utilisé pour lire vos disponibilités et créer les rendez-vous.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              {calendar.connected ? <CheckCircle2 className="size-6 text-success" /> : <AlertTriangle className="size-6 text-warning" />}
              <div>
                <p className="font-semibold">{calendar.connected ? "Connecté" : "Non connecté"}</p>
                <p className="text-sm text-muted-foreground">{user.email} · agenda principal</p>
              </div>
            </div>
            <GoogleSignInButton label={calendar.connected ? "Reconnecter" : "Connecter Google Calendar"} next="/dashboard/settings" className="sm:w-auto" />
          </CardContent>
        </Card>

        <PreferencesForm
          providers={providers}
          initial={{
            clientEmail: prefs?.clientEmail ?? true,
            clientSms: prefs?.clientSms ?? false,
            clientWhatsapp: prefs?.clientWhatsapp ?? false,
            hostEmail: prefs?.hostEmail ?? true,
            hostSms: prefs?.hostSms ?? false,
            hostWhatsapp: prefs?.hostWhatsapp ?? false,
            remind24h: prefs?.remind24h ?? true,
            remind1h: prefs?.remind1h ?? true,
          }}
        />
      </div>
    </>
  )
}
