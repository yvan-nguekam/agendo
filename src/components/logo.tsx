import Link from "next/link"
import { cn } from "@/lib/utils"

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2 font-bold tracking-tight", className)} aria-label="Agendo, accueil">
      <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm shadow-primary/30">
        <svg viewBox="0 0 24 24" fill="none" className="size-[18px]" aria-hidden="true">
          <rect x="3.5" y="5" width="17" height="15" rx="3" stroke="currentColor" strokeWidth="2" />
          <path d="M8 3v4M16 3v4M3.5 10h17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="m9 14.5 2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="text-lg">Agendo</span>
    </Link>
  )
}
