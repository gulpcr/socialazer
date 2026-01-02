import { AppHeader } from "@/components/app-header"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

export default function CampaignsPage() {
  return (
    <>
      <AppHeader title="Campaigns" />
      <main className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Campaigns</h2>
              <p className="text-muted-foreground">Organize and track your ad campaigns</p>
            </div>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Campaign
            </Button>
          </div>

          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 rounded-full bg-muted p-4">
              <Plus className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-medium">No campaigns yet</h3>
            <p className="mb-4 max-w-sm text-sm text-muted-foreground">
              Create your first campaign to organize your ads and track performance
            </p>
            <Button>Create Campaign</Button>
          </div>
        </div>
      </main>
    </>
  )
}
