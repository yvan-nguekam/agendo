import { cn } from "@/lib/utils"

const STATUS = {
  CONFIRMED: { label: "Confirmé", className: "bg-secondary text-secondary-foreground" },
  CANCELLED: { label: "Annulé", className: "bg-destructive/10 text-destructive" },
  COMPLETED: { label: "Honoré", className: "bg-success/12 text-success" },
  NO_SHOW: { label: "Absent", className: "bg-warning/12 text-warning" },
} as const

export function StatusBadge({ status }: { status: keyof typeof STATUS }) {
  const s = STATUS[status]
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", s.className)}>{s.label}</span>
}
