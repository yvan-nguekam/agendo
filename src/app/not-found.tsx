import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/logo"

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 text-center">
      <Logo />
      <div>
        <p className="text-sm font-semibold text-primary">404</p>
        <h1 className="mt-2 text-3xl font-bold">Page introuvable</h1>
        <p className="mt-2 text-muted-foreground">Ce lien n&apos;existe pas ou n&apos;est plus actif.</p>
      </div>
      <Button asChild><Link href="/">Retour à l&apos;accueil</Link></Button>
    </div>
  )
}
