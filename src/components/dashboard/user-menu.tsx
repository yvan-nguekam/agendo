"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { ExternalLink, LogOut, Moon, Settings, Sun } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { signOut } from "@/lib/auth-client"

export function UserMenu({ name, email, image, slug }: { name: string; email: string; image: string | null; slug: string | null }) {
  const router = useRouter()
  const { resolvedTheme, setTheme } = useTheme()
  const initials = name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="cursor-pointer rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50" aria-label="Menu du compte">
        <Avatar className="size-9">
          {image && <AvatarImage src={image} alt="" />}
          <AvatarFallback className="bg-secondary font-semibold text-primary">{initials}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <p className="truncate font-semibold text-foreground">{name}</p>
          <p className="truncate text-xs text-muted-foreground">{email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {slug && (
          <DropdownMenuItem asChild>
            <a href={`/book/${slug}`} target="_blank" rel="noreferrer"><ExternalLink /> Ma page de réservation</a>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild>
          <Link href="/dashboard/settings"><Settings /> Paramètres</Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>
          {resolvedTheme === "dark" ? <Sun /> : <Moon />} Thème {resolvedTheme === "dark" ? "clair" : "sombre"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onSelect={async () => {
            await signOut()
            router.push("/login")
            router.refresh()
          }}
        >
          <LogOut /> Se déconnecter
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
