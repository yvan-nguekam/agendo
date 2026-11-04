import { PageHeader } from "@/components/dashboard/page-header"
import { AvailabilityEditor } from "@/components/dashboard/availability-editor"
import { db } from "@/lib/db"
import { requireUser } from "@/lib/session"

export const metadata = { title: "Disponibilités" }

export default async function AvailabilityPage() {
  const user = await requireUser()
  const windows = await db.availability.findMany({
    where: { userId: user.id },
    orderBy: [{ weekday: "asc" }, { startMin: "asc" }],
    select: { weekday: true, startMin: true, endMin: true },
  })
  return (
    <>
      <PageHeader title="Disponibilités" description="Quand vos clients peuvent-ils réserver ?" />
      <AvailabilityEditor initial={windows} minNoticeMin={user.minNoticeMin} maxDaysAhead={user.maxDaysAhead} timezone={user.timezone} />
    </>
  )
}
