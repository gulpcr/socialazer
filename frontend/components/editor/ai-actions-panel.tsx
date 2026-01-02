"use client"

import type React from "react"

import { useState } from "react"
import { Sparkles, Maximize2, Type, MessageSquare, Captions, Wand2, Loader2, Check, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

interface AIAction {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  category: "resize" | "text" | "enhance"
}

const aiActions: AIAction[] = [
  {
    id: "magic-resize",
    name: "Magic Resize",
    description: "Resize to all platforms (9:16, 1:1, 16:9) instantly",
    icon: <Maximize2 className="h-4 w-4" />,
    category: "resize",
  },
  {
    id: "smart-headline",
    name: "Smart Headlines",
    description: "Generate compelling headlines based on your content",
    icon: <Type className="h-4 w-4" />,
    category: "text",
  },
  {
    id: "auto-cta",
    name: "Auto CTA",
    description: "Suggest powerful call-to-action text",
    icon: <MessageSquare className="h-4 w-4" />,
    category: "text",
  },
  {
    id: "auto-captions",
    name: "Auto Captions",
    description: "Generate captions from voice-over automatically",
    icon: <Captions className="h-4 w-4" />,
    category: "enhance",
  },
  {
    id: "enhance-visuals",
    name: "Enhance Visuals",
    description: "Improve colors, contrast, and visual appeal",
    icon: <Wand2 className="h-4 w-4" />,
    category: "enhance",
  },
]

const resizeTargets = [
  { id: "9:16", name: "TikTok / Reels", aspect: "9:16" },
  { id: "1:1", name: "Instagram Feed", aspect: "1:1" },
  { id: "16:9", name: "YouTube / Landscape", aspect: "16:9" },
]

interface AIActionsPanelProps {
  onActionComplete?: (actionId: string, result: unknown) => void
}

export function AIActionsPanel({ onActionComplete }: AIActionsPanelProps) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null)
  const [completedActions, setCompletedActions] = useState<string[]>([])
  const [showResults, setShowResults] = useState<string | null>(null)

  const handleAction = async (actionId: string) => {
    setLoadingAction(actionId)
    // Simulate AI processing
    await new Promise((resolve) => setTimeout(resolve, 1500))
    setLoadingAction(null)
    setCompletedActions((prev) => [...prev, actionId])
    setShowResults(actionId)
    onActionComplete?.(actionId, { success: true })
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20 hover:border-primary/40"
        >
          <Sparkles className="h-4 w-4 text-primary" />
          AI Actions
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-96">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Quick Actions
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Magic Resize Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Maximize2 className="h-4 w-4" />
              Magic Resize
            </h3>
            <div className="grid gap-2">
              {resizeTargets.map((target) => (
                <button
                  key={target.id}
                  onClick={() => handleAction(`resize-${target.id}`)}
                  className={cn(
                    "flex items-center justify-between rounded-lg border p-3 text-left transition-colors hover:bg-muted",
                    completedActions.includes(`resize-${target.id}`) && "border-green-500/50 bg-green-500/5",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
                      <span className="text-xs font-medium">{target.aspect}</span>
                    </div>
                    <span className="text-sm font-medium">{target.name}</span>
                  </div>
                  {loadingAction === `resize-${target.id}` ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  ) : completedActions.includes(`resize-${target.id}`) ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              ))}
            </div>
            <Button
              variant="default"
              className="w-full"
              onClick={() => handleAction("magic-resize-all")}
              disabled={loadingAction !== null}
            >
              {loadingAction === "magic-resize-all" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resizing...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Resize to All Formats
                </>
              )}
            </Button>
          </div>

          {/* Text Enhancement */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Type className="h-4 w-4" />
              Text Enhancement
            </h3>
            <div className="space-y-2">
              {aiActions
                .filter((a) => a.category === "text")
                .map((action) => (
                  <button
                    key={action.id}
                    onClick={() => handleAction(action.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted",
                      completedActions.includes(action.id) && "border-green-500/50 bg-green-500/5",
                    )}
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                      {action.icon}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{action.name}</p>
                      <p className="text-xs text-muted-foreground">{action.description}</p>
                    </div>
                    {loadingAction === action.id ? (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    ) : completedActions.includes(action.id) ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                ))}
            </div>
          </div>

          {/* Auto Enhance */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Wand2 className="h-4 w-4" />
              Auto Enhance
            </h3>
            <div className="space-y-2">
              {aiActions
                .filter((a) => a.category === "enhance")
                .map((action) => (
                  <button
                    key={action.id}
                    onClick={() => handleAction(action.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted",
                      completedActions.includes(action.id) && "border-green-500/50 bg-green-500/5",
                    )}
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                      {action.icon}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{action.name}</p>
                      <p className="text-xs text-muted-foreground">{action.description}</p>
                    </div>
                    {loadingAction === action.id ? (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    ) : completedActions.includes(action.id) ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                ))}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
