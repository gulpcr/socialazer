"use client"

import { useState } from "react"
import { Undo2, Redo2, History } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

interface HistoryItem {
  id: string
  action: string
  timestamp: Date
  description: string
}

const mockHistory: HistoryItem[] = [
  { id: "1", action: "add", timestamp: new Date(Date.now() - 60000), description: "Added headline text" },
  { id: "2", action: "move", timestamp: new Date(Date.now() - 45000), description: "Moved CTA button" },
  { id: "3", action: "style", timestamp: new Date(Date.now() - 30000), description: "Changed text color" },
  { id: "4", action: "resize", timestamp: new Date(Date.now() - 20000), description: "Resized image" },
  { id: "5", action: "add", timestamp: new Date(Date.now() - 10000), description: "Added product image" },
]

interface HistoryPanelProps {
  onUndo?: () => void
  onRedo?: () => void
  onJumpTo?: (historyId: string) => void
}

export function HistoryPanel({ onUndo, onRedo, onJumpTo }: HistoryPanelProps) {
  const [currentIndex, setCurrentIndex] = useState(mockHistory.length - 1)

  const formatTime = (date: Date) => {
    const diff = Date.now() - date.getTime()
    const seconds = Math.floor(diff / 1000)
    if (seconds < 60) return `${seconds}s ago`
    const minutes = Math.floor(seconds / 60)
    return `${minutes}m ago`
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <History className="h-3.5 w-3.5" />
          History
        </h4>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onUndo} disabled={currentIndex <= 0}>
            <Undo2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onRedo}
            disabled={currentIndex >= mockHistory.length - 1}
          >
            <Redo2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <ScrollArea className="h-40">
        <div className="space-y-1 pr-3">
          {mockHistory.map((item, index) => (
            <button
              key={item.id}
              onClick={() => {
                setCurrentIndex(index)
                onJumpTo?.(item.id)
              }}
              className={cn(
                "w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors",
                index === currentIndex
                  ? "bg-primary/10 text-primary"
                  : index > currentIndex
                    ? "text-muted-foreground/50 hover:bg-muted"
                    : "text-foreground hover:bg-muted",
              )}
            >
              <div
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  index === currentIndex
                    ? "bg-primary"
                    : index > currentIndex
                      ? "bg-muted-foreground/30"
                      : "bg-muted-foreground",
                )}
              />
              <span className="flex-1 truncate">{item.description}</span>
              <span className="text-muted-foreground shrink-0">{formatTime(item.timestamp)}</span>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
