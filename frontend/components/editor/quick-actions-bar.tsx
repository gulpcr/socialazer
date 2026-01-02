"use client"

import { Type, ImageIcon, Video, Music, Upload, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { LayerType } from "@/lib/editor-types"

interface QuickActionsBarProps {
  onAddElement: (type: LayerType) => void
  onUpload: () => void
  onAIGenerate: () => void
}

const quickActions = [
  { type: "text" as LayerType, icon: Type, label: "Add Text", shortcut: "T" },
  { type: "image" as LayerType, icon: ImageIcon, label: "Add Image", shortcut: "I" },
  { type: "video" as LayerType, icon: Video, label: "Add Video", shortcut: "V" },
  { type: "audio" as LayerType, icon: Music, label: "Add Audio", shortcut: "A" },
]

export function QuickActionsBar({ onAddElement, onUpload, onAIGenerate }: QuickActionsBarProps) {
  return (
    <TooltipProvider>
      <div className="flex items-center gap-1 p-2 border-b bg-muted/30">
        {quickActions.map((action) => {
          const Icon = action.icon
          return (
            <Tooltip key={action.type}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 gap-1.5 px-2.5"
                  onClick={() => onAddElement(action.type)}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-xs hidden sm:inline">{action.label.replace("Add ", "")}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {action.label}
                <kbd className="ml-2 text-[10px] bg-muted px-1 rounded">{action.shortcut}</kbd>
              </TooltipContent>
            </Tooltip>
          )
        })}

        <div className="w-px h-5 bg-border mx-1" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" className="h-9 gap-1.5 px-2.5" onClick={onUpload}>
              <Upload className="h-4 w-4" />
              <span className="text-xs hidden sm:inline">Upload</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Upload Media</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 gap-1.5 px-2.5 text-primary hover:text-primary"
              onClick={onAIGenerate}
            >
              <Sparkles className="h-4 w-4" />
              <span className="text-xs hidden sm:inline">AI Generate</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Generate with AI</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}
