"use client"

import { useState, useTransition } from "react"
import { Loader2 } from "lucide-react"
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cancelByToken } from "@/app/manage/[token]/actions"

export function CancelBookingButton({ token }: { token: string }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [pending, start] = useTransition()
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="lg" className="w-full sm:w-auto">Annuler le rendez-vous</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Annuler ce rendez-vous ?</AlertDialogTitle>
          <AlertDialogDescription>Le créneau sera libéré et le professionnel sera prévenu.</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="cancel-reason">Motif (facultatif)</Label>
          <Textarea id="cancel-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Garder le rendez-vous</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await cancelByToken(token, reason)
                if (res.ok) {
                  toast.success("Rendez-vous annulé")
                  setOpen(false)
                } else toast.error(res.error)
              })
            }
          >
            {pending && <Loader2 className="size-4 animate-spin" />} Confirmer l&apos;annulation
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
