import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export function HostHeader({ name, image, subtitle }: { name: string; image: string | null; subtitle?: string }) {
  const initials = name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()
  return (
    <div className="flex items-center gap-4">
      <Avatar className="size-14 ring-4 ring-secondary">
        {image && <AvatarImage src={image} alt="" />}
        <AvatarFallback className="bg-primary text-lg font-bold text-primary-foreground">{initials}</AvatarFallback>
      </Avatar>
      <div>
        <p className="text-xl font-bold">{name}</p>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  )
}

export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-[radial-gradient(80%_50%_at_50%_0%,color-mix(in_oklab,var(--primary)_10%,transparent),transparent)] px-4 py-10 sm:py-16">
      <main className="mx-auto w-full max-w-4xl">{children}</main>
      <p className="mt-10 text-center text-xs text-muted-foreground">
        Propulsé par <Link href="/" className="font-semibold text-primary hover:underline">Agendo</Link>
      </p>
    </div>
  )
}
