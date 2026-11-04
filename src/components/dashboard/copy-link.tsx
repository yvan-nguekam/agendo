"use client"

import { useState } from "react"
import { Check, Copy } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

export function CopyLinkButton({ path, label = "Copier le lien", variant = "outline" }: { path: string; label?: string; variant?: "outline" | "default" | "secondary" }) {
  const [copied, setCopied] = useState(false)
  return (
    <Button
      variant={variant}
      onClick={async () => {
        await navigator.clipboard.writeText(`${window.location.origin}${path}`)
        setCopied(true)
        toast.success("Lien copié dans le presse-papiers")
        setTimeout(() => setCopied(false), 2000)
      }}
    >
      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      {label}
    </Button>
  )
}
