"use client"

import { useState } from "react"
import {
  Copy,
  Trash2,
  MoveUp,
  MoveDown,
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
  Sparkles,
  ChevronDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface FloatingToolbarProps {
  elementType: "text" | "image" | "video" | "audio" | null
  position: { x: number; y: number }
  visible: boolean
  onDuplicate: () => void
  onDelete: () => void
  onBringForward: () => void
  onSendBackward: () => void
  onAIEnhance: () => void
}

const colorPresets = ["#FFFFFF", "#000000", "#EF4444", "#F97316", "#EAB308", "#22C55E", "#3B82F6", "#8B5CF6", "#EC4899"]

const animationPresets = [
  { id: "fade-in", name: "Fade In" },
  { id: "slide-up", name: "Slide Up" },
  { id: "scale", name: "Scale" },
  { id: "bounce", name: "Bounce" },
  { id: "typewriter", name: "Typewriter" },
]

export function FloatingToolbar({
  elementType,
  position,
  visible,
  onDuplicate,
  onDelete,
  onBringForward,
  onSendBackward,
  onAIEnhance,
}: FloatingToolbarProps) {
  const [selectedColor, setSelectedColor] = useState("#FFFFFF")

  if (!visible || !elementType) return null

  return (
    <div
      className={cn(
        "absolute z-50 flex items-center gap-1 rounded-lg border bg-popover p-1 shadow-lg",
        "animate-in fade-in-0 zoom-in-95",
      )}
      style={{
        left: position.x,
        top: position.y - 50,
        transform: "translateX(-50%)",
      }}
    >
      {/* Text-specific controls */}
      {elementType === "text" && (
        <>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Bold className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Italic className="h-4 w-4" />
          </Button>
          <div className="mx-1 h-6 w-px bg-border" />
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <AlignLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <AlignCenter className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <AlignRight className="h-4 w-4" />
          </Button>
          <div className="mx-1 h-6 w-px bg-border" />
        </>
      )}

      {/* Color picker */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <div className="h-4 w-4 rounded-full border" style={{ backgroundColor: selectedColor }} />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="center">
          <div className="grid grid-cols-5 gap-1">
            {colorPresets.map((color) => (
              <button
                key={color}
                onClick={() => setSelectedColor(color)}
                className={cn(
                  "h-6 w-6 rounded-full border transition-transform hover:scale-110",
                  selectedColor === color && "ring-2 ring-primary ring-offset-2",
                )}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Animation presets */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 gap-1 px-2 text-xs">
            <Sparkles className="h-3 w-3" />
            Animate
            <ChevronDown className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-36 p-1" align="center">
          {animationPresets.map((preset) => (
            <button key={preset.id} className="w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted">
              {preset.name}
            </button>
          ))}
        </PopoverContent>
      </Popover>

      <div className="mx-1 h-6 w-px bg-border" />

      {/* AI Enhance */}
      <Button variant="ghost" size="sm" className="h-8 gap-1 px-2 text-xs text-primary" onClick={onAIEnhance}>
        <Sparkles className="h-3 w-3" />
        AI
      </Button>

      <div className="mx-1 h-6 w-px bg-border" />

      {/* Layer controls */}
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBringForward}>
        <MoveUp className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onSendBackward}>
        <MoveDown className="h-4 w-4" />
      </Button>

      <div className="mx-1 h-6 w-px bg-border" />

      {/* Common actions */}
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onDuplicate}>
        <Copy className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-destructive hover:text-destructive"
        onClick={onDelete}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}
