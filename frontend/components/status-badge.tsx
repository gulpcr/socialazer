import { cn } from "@/lib/utils"
import type { AdStatus } from "@/lib/types"

interface StatusBadgeProps {
  status: AdStatus
  className?: string
}

const statusConfig: Record<AdStatus, { label: string; className: string }> = {
  draft: {
    label: "Draft",
    className: "bg-muted text-muted-foreground",
  },
  rendering: {
    label: "Rendering",
    className: "bg-warning/15 text-warning-foreground border border-warning/30",
  },
  ready: {
    label: "Ready",
    className: "bg-success/15 text-success border border-success/30",
  },
  failed: {
    label: "Failed",
    className: "bg-destructive/15 text-destructive border border-destructive/30",
  },
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status]

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        config.className,
        className,
      )}
    >
      {status === "rendering" && <span className="mr-1.5 h-1.5 w-1.5 animate-pulse rounded-full bg-current" />}
      {config.label}
    </span>
  )
}
