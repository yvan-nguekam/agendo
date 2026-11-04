import { formatInTimeZone } from "date-fns-tz"
import { fr } from "date-fns/locale"

export function slugify(input: string) {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
}

export function formatDateTime(date: Date | string, tz: string, pattern = "EEEE d MMMM yyyy 'à' HH:mm") {
  return formatInTimeZone(new Date(date), tz, pattern, { locale: fr })
}

export function formatTime(date: Date | string, tz: string) {
  return formatInTimeZone(new Date(date), tz, "HH:mm", { locale: fr })
}

export function formatPrice(cents: number | null | undefined, currency = "EUR") {
  if (cents == null) return null
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(cents / 100)
}

export function minutesToHHMM(min: number) {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`
}

export function hhmmToMinutes(value: string) {
  const [h, m] = value.split(":").map(Number)
  return h * 60 + (m || 0)
}

export function formatDuration(min: number) {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h} h ${m}` : `${h} h`
}

export const WEEKDAYS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"]

export function appUrl(path = "") {
  const base = (process.env.NEXT_PUBLIC_APP_URL || process.env.BETTER_AUTH_URL || "http://localhost:3000").replace(/\/$/, "")
  return `${base}${path}`
}
