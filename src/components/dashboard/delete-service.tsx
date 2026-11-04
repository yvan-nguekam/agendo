"use client"

import { useTransition } from "react"
import { Trash2 } from "lucide-react"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { deleteService } from "@/app/dashboard/actions"

export function DeleteServiceButton({ id, name }: { id: string; name: string }) {
  const [pending, start] = useTransition()
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Supprimer ${name}`} disabled={pending} className="text-muted-foreground hover:text-destructive">
          <Trash2 className="size-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer « {name} » ?</AlertDialogTitle>
          <AlertDialogDescription>Si des rendez-vous y sont liés, la prestation sera simplement désactivée.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={() =>
              start(async () => {
                const res = await deleteService(id)
                if (res.ok) toast.success(res.message)
                else toast.error(res.error)
              })
            }
          >
            Supprimer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
