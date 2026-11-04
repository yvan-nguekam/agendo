"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { CheckCheck } from "lucide-react"
import { Button } from "@/components/ui/button"

export function MarkAllReadButton() {
  const router = useRouter()
  const [pending, start] = useTransition()
  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await fetch("/api/notifications/read", { method: "POST", body: JSON.stringify({ all: true }) })
          router.refresh()
        })
      }
    >
      <CheckCheck className="size-4" /> Tout marquer comme lu
    </Button>
  )
}
