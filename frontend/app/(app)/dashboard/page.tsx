import Link from "next/link"
import { Plus, Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AppHeader } from "@/components/app-header"
import { AdCard } from "@/components/ad-card"
import { mockAds } from "@/lib/mock-data"

export default function DashboardPage() {
  return (
    <>
      <AppHeader title="Dashboard" />
      <main className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-7xl">
          {/* Hero Section */}
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Welcome back, John</h2>
              <p className="text-muted-foreground">Create stunning social ads in minutes</p>
            </div>
            <div className="flex gap-2">
              <Button asChild size="lg" variant="outline" className="gap-2 bg-transparent">
                <Link href="/templates">
                  <Plus className="h-4 w-4" />
                  Create from Template
                </Link>
              </Button>
              <Button asChild size="lg" className="gap-2">
                <Link href="/create/from-url">
                  <Globe className="h-4 w-4" />
                  Create from URL
                </Link>
              </Button>
            </div>
          </div>

          {/* Recent Ads Section */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-medium">Recent Ads</h3>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/ads">View all</Link>
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {mockAds.map((ad) => (
                <AdCard key={ad.id} ad={ad} />
              ))}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border bg-card p-4">
              <p className="text-sm text-muted-foreground">Total Ads</p>
              <p className="text-2xl font-semibold">24</p>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <p className="text-sm text-muted-foreground">Renders This Month</p>
              <p className="text-2xl font-semibold">156</p>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <p className="text-sm text-muted-foreground">Storage Used</p>
              <p className="text-2xl font-semibold">2.4 GB</p>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
