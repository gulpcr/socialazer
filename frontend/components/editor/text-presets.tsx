"use client"

import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"

interface TextPreset {
  id: string
  name: string
  preview: string
  style: {
    fontSize: number
    fontWeight: string
    color: string
    backgroundColor?: string
    textAlign?: string
  }
}

const textPresets: TextPreset[] = [
  {
    id: "headline-bold",
    name: "Bold Headline",
    preview: "HEADLINE",
    style: { fontSize: 48, fontWeight: "900", color: "#FFFFFF" },
  },
  {
    id: "headline-light",
    name: "Light Headline",
    preview: "Headline",
    style: { fontSize: 42, fontWeight: "300", color: "#FFFFFF" },
  },
  {
    id: "subheadline",
    name: "Subheadline",
    preview: "Subheadline Text",
    style: { fontSize: 24, fontWeight: "500", color: "#FFFFFF" },
  },
  {
    id: "body",
    name: "Body Text",
    preview: "Body text for descriptions",
    style: { fontSize: 16, fontWeight: "400", color: "#FFFFFF" },
  },
  {
    id: "caption",
    name: "Caption",
    preview: "Small caption text",
    style: { fontSize: 12, fontWeight: "400", color: "rgba(255,255,255,0.7)" },
  },
  {
    id: "cta-button",
    name: "CTA Button",
    preview: "Shop Now",
    style: { fontSize: 14, fontWeight: "600", color: "#000000", backgroundColor: "#FFFFFF" },
  },
  {
    id: "cta-outline",
    name: "CTA Outline",
    preview: "Learn More",
    style: { fontSize: 14, fontWeight: "500", color: "#FFFFFF" },
  },
  {
    id: "quote",
    name: "Quote",
    preview: '"Inspiring quote"',
    style: { fontSize: 20, fontWeight: "400", color: "#FFFFFF" },
  },
]

interface TextPresetsProps {
  onSelectPreset: (preset: TextPreset) => void
}

export function TextPresets({ onSelectPreset }: TextPresetsProps) {
  return (
    <div className="space-y-3">
      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Text Styles</h4>
      <ScrollArea className="h-48">
        <div className="grid grid-cols-2 gap-2 pr-3">
          {textPresets.map((preset) => (
            <button
              key={preset.id}
              onClick={() => onSelectPreset(preset)}
              className={cn(
                "group relative flex flex-col items-center justify-center rounded-lg border bg-gradient-to-br from-slate-800 to-slate-900 p-4 text-center transition-all hover:border-primary hover:shadow-md",
                "min-h-[80px]",
              )}
            >
              <span
                style={{
                  fontSize: `${Math.min(preset.style.fontSize / 3, 16)}px`,
                  fontWeight: preset.style.fontWeight,
                  color: preset.style.color,
                  backgroundColor: preset.style.backgroundColor,
                  padding: preset.style.backgroundColor ? "4px 8px" : undefined,
                  borderRadius: preset.style.backgroundColor ? "4px" : undefined,
                }}
              >
                {preset.preview}
              </span>
              <span className="mt-2 text-[10px] text-muted-foreground group-hover:text-foreground">{preset.name}</span>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}

export type { TextPreset }
