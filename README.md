# Agendo — SaaS de prise de rendez-vous synchronisé Google Calendar

Next.js 16 (App Router) · Tailwind v4 · shadcn/ui · Prisma 7 (PostgreSQL) · Better Auth (Google) ·
Google Calendar API · Resend (e-mail) · Twilio (SMS / WhatsApp).
Design system généré avec **UI/UX Pro Max** (`.claude/skills/ui-ux-pro-max`) : style *Trust & Authority + Minimal*,
bleu confiance `#1d4ed8` + orange réservation `#ea580c`, police Plus Jakarta Sans.

## Fonctionnalités

| Côté professionnel (`/dashboard`) | Côté client (public) |
|---|---|
| Connexion Google (agenda synchronisé) | `/book/<slug>` : choix de la prestation |
| Vue d'ensemble : stats, prochains RDV, événements Google | `/book/<slug>/<service>` : calendrier + créneaux libres |
| Rendez-vous : à venir / passés / annulés, recherche, annulation, honoré/absent | `/manage/<token>` : confirmation, ajout à l'agenda, annulation |
| Prestations : durée, pause, prix, couleur, lieu ou Google Meet auto | |
| Disponibilités : plusieurs plages par jour, délai mini, horizon | |
| Notifications : cloche temps réel + toasts, historique, journal des envois | |
| Paramètres : profil, lien public, fuseau, canaux, boutons « Tester » | |

**Créneaux** = horaires d'ouverture − délai minimum − RDV Agendo (+ pause) − événements occupés Google (`freebusy`).
La réservation revérifie le créneau dans une transaction sérialisable (pas de double réservation).

**Notifications & alertes**
- Client : confirmation, rappel 24 h, rappel 1 h, annulation — par e-mail, SMS, WhatsApp (selon préférences).
- Professionnel : nouvelle réservation / annulation par e-mail, SMS, WhatsApp + cloche in-app (sondage 30 s, toast).
- Alertes in-app automatiques : RDV dans 1 h, échec de synchro Google, échec d'envoi e-mail/SMS/WhatsApp.
- Chaque envoi est journalisé (`NotificationDelivery`). Sans clés API, les messages sont affichés dans la console (statut « Non configuré »).

## Démarrage

```bash
pnpm install
cp .env.example .env          # puis remplir les variables
pnpm prisma dev --name agendo --detach   # Postgres local (ou votre propre DATABASE_URL)
pnpm db:migrate
pnpm dev
```

### Google Cloud (obligatoire)
1. console.cloud.google.com → nouveau projet → **API & Services › Bibliothèque** → activer **Google Calendar API**.
2. **Écran de consentement OAuth** : type Externe, ajouter les scopes
   `calendar.events` et `calendar.freebusy`, et vos comptes de test.
3. **Identifiants › ID client OAuth › Application Web**, URI de redirection :
   `http://localhost:3000/api/auth/callback/google` (+ l'URL de production).
4. Copier l'ID et le secret dans `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.

> En production, les scopes Calendar sont « sensibles » : Google demande une vérification de l'application avant de l'ouvrir au public.

### E-mails — Resend
Clé `RESEND_API_KEY` + `EMAIL_FROM` sur un domaine vérifié chez Resend.

### SMS / WhatsApp — Twilio
`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_SMS_FROM`, `TWILIO_WHATSAPP_FROM`.
WhatsApp : la sandbox (`whatsapp:+14155238886`) suffit pour tester ; en production, les messages
envoyés hors fenêtre de 24 h doivent utiliser des **modèles approuvés** par Meta.

### Rappels (cron)
`GET /api/cron/reminders` avec `Authorization: Bearer $CRON_SECRET`, toutes les 10 min (`vercel.json`).
Sur Vercel Hobby, les crons sont limités à 1/jour : utilisez Vercel Pro ou un cron externe (cron-job.org, GitHub Actions…).
En local : `CRON_SECRET=... pnpm reminders`.

## Structure

```
src/
  app/
    page.tsx                 landing
    login/                   connexion Google
    dashboard/               espace pro (+ actions.ts : server actions)
    book/[slug]/…            réservation publique
    manage/[token]/          gestion du RDV par le client
    api/public/{slots,bookings}  API publique
    api/notifications/…      cloche
    api/cron/reminders       rappels
  lib/
    auth.ts                  Better Auth + scopes Google Calendar
    google-calendar.ts       freebusy, création/suppression d'événements, Meet
    slots.ts                 calcul des créneaux
    bookings.ts              création / annulation (+ synchro Google + notifications)
    reminders.ts             rappels 24 h / 1 h
    notifications/           canaux (Resend, Twilio), modèles d'e-mails, dispatch
  proxy.ts                   protection de /dashboard
prisma/schema.prisma
```
