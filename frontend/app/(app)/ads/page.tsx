import Link from "next/link"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AppHeader } from "@/components/app-header"
import { AdCard } from "@/components/ad-card"
import { mockAds } from "@/lib/mock-data"

export default function AdsPage() {
  return (
    <>
      <AppHeader title="My Ads" />
      <main className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">My Ads</h2>
              <p className="text-muted-foreground">Manage all your created ads</p>
            </div>
            <Button asChild className="gap-2">
              <Link href="/templates">
                <Plus className="h-4 w-4" />
                Create New
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {mockAds.map((ad) => (
              <AdCard key={ad.id} ad={ad} />
            ))}
          </div>
        </div>
      </main>
    </>
  )
}
