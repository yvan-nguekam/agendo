"use client"

import { useState, useTransition } from "react"
import { CalendarX, CheckCircle2, Loader2, MoreHorizontal, UserX } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cancelBookingAction, setBookingStatus, type ActionResult } from "@/app/dashboard/actions"

export function BookingActions({ id, status, isPast, clientName }: { id: string; status: string; isPast: boolean; clientName: string }) {
  const [pending, start] = useTransition()
  const [cancelOpen, setCancelOpen] = useState(false)
  const [reason, setReason] = useState("")

  const run = (fn: () => Promise<ActionResult>) =>
    start(async () => {
      const res = await fn()
      if (res.ok) toast.success(res.message ?? "Enregistré")
      else toast.error(res.error)
    })

  if (status === "CANCELLED") return null

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`Actions pour le rendez-vous de ${clientName}`} disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <MoreHorizontal className="size-4" />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          {isPast && (
            <>
              <DropdownMenuItem onSelect={() => run(() => setBookingStatus(id, "COMPLETED"))}>
                <CheckCircle2 /> Marquer honoré
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => run(() => setBookingStatus(id, "NO_SHOW"))}>
                <UserX /> Marquer absent
              </DropdownMenuItem>
            </>
          )}
          {!isPast && status === "CONFIRMED" && (
            <DropdownMenuItem variant="destructive" onSelect={() => setCancelOpen(true)}>
              <CalendarX /> Annuler le rendez-vous
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler le rendez-vous de {clientName} ?</AlertDialogTitle>
            <AlertDialogDescription>
              L&apos;événement sera retiré de Google Calendar et le client sera prévenu selon vos préférences de notification.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-2">
            <Label htmlFor={`reason-${id}`}>Motif (facultatif, envoyé au client)</Label>
            <Textarea id={`reason-${id}`} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder="Ex. : imprévu, merci de reprendre un créneau." />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Retour</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() => {
                run(() => cancelBookingAction(id, reason))
                setCancelOpen(false)
              }}
            >
              Annuler le rendez-vous
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
