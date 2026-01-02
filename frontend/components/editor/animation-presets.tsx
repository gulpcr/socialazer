"use client"

import type React from "react"

import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sparkles, ArrowUp, ArrowRight, Maximize2, RotateCw, Zap } from "lucide-react"

interface AnimationPreset {
  id: string
  name: string
  icon: React.ReactNode
  description: string
  keyframes: string
}

const animationPresets: AnimationPreset[] = [
  {
    id: "fade-in",
    name: "Fade In",
    icon: <Sparkles className="h-4 w-4" />,
    description: "Smooth opacity transition",
    keyframes: "opacity: 0 → 1",
  },
  {
    id: "slide-up",
    name: "Slide Up",
    icon: <ArrowUp className="h-4 w-4" />,
    description: "Enter from bottom",
    keyframes: "translateY: 100% → 0",
  },
  {
    id: "slide-right",
    name: "Slide Right",
    icon: <ArrowRight className="h-4 w-4" />,
    description: "Enter from left",
    keyframes: "translateX: -100% → 0",
  },
  {
    id: "scale-up",
    name: "Scale Up",
    icon: <Maximize2 className="h-4 w-4" />,
    description: "Grow from small",
    keyframes: "scale: 0 → 1",
  },
  {
    id: "rotate-in",
    name: "Rotate In",
    icon: <RotateCw className="h-4 w-4" />,
    description: "Spin while appearing",
    keyframes: "rotate: -180° → 0",
  },
  {
    id: "bounce",
    name: "Bounce",
    icon: <Zap className="h-4 w-4" />,
    description: "Playful bounce effect",
    keyframes: "scale: 0 → 1.2 → 1",
  },
  {
    id: "typewriter",
    name: "Typewriter",
    icon: <Sparkles className="h-4 w-4" />,
    description: "Letter by letter reveal",
    keyframes: "width: 0 → 100%",
  },
  {
    id: "blur-in",
    name: "Blur In",
    icon: <Sparkles className="h-4 w-4" />,
    description: "Blur to sharp focus",
    keyframes: "blur: 10px → 0",
  },
]

interface AnimationPresetsProps {
  selectedAnimation?: string
  onSelectAnimation: (animationId: string) => void
}

export function AnimationPresets({ selectedAnimation, onSelectAnimation }: AnimationPresetsProps) {
  return (
    <div className="space-y-3">
      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Animations</h4>
      <ScrollArea className="h-56">
        <div className="space-y-1 pr-3">
          {animationPresets.map((preset) => (
            <button
              key={preset.id}
              onClick={() => onSelectAnimation(preset.id)}
              className={cn(
                "w-full flex items-center gap-3 rounded-lg border p-2.5 text-left transition-all hover:bg-muted",
                selectedAnimation === preset.id && "border-primary bg-primary/5",
              )}
            >
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-md",
                  selectedAnimation === preset.id ? "bg-primary text-primary-foreground" : "bg-muted",
                )}
              >
                {preset.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{preset.name}</p>
                <p className="text-xs text-muted-foreground truncate">{preset.description}</p>
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}

export type { AnimationPreset }
