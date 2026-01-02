"use client"

import { useState } from "react"
import { ArrowLeft, ArrowRight, Smartphone, Square, Monitor } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import type { VideoConfig } from "@/lib/types"

interface VideoConfigStepProps {
  config: VideoConfig
  onComplete: (config: VideoConfig) => void
  onBack: () => void
}

const platforms = [
  { id: "instagram", label: "Instagram" },
  { id: "tiktok", label: "TikTok" },
  { id: "youtube", label: "YouTube Shorts" },
  { id: "facebook", label: "Facebook" },
  { id: "linkedin", label: "LinkedIn" },
] as const

const durations = [15, 30, 60] as const

const aspectRatios = [
  { id: "9:16", label: "9:16", sublabel: "Vertical", icon: Smartphone },
  { id: "1:1", label: "1:1", sublabel: "Square", icon: Square },
  { id: "16:9", label: "16:9", sublabel: "Horizontal", icon: Monitor },
] as const

const tones = [
  { id: "professional", label: "Professional" },
  { id: "casual", label: "Casual" },
  { id: "energetic", label: "Energetic" },
  { id: "emotional", label: "Emotional" },
  { id: "humorous", label: "Humorous" },
] as const

const voiceStyles = [
  { id: "narrative", label: "Narrative" },
  { id: "conversational", label: "Conversational" },
  { id: "urgent", label: "Urgent" },
  { id: "calm", label: "Calm" },
] as const

export function VideoConfigStep({ config, onComplete, onBack }: VideoConfigStepProps) {
  const [data, setData] = useState<VideoConfig>(config)

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold tracking-tight">Configure Your Video</h2>
        <p className="mt-1 text-muted-foreground">Set the platform, duration, and style for your video ad</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Platform</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {platforms.map((platform) => (
              <Button
                key={platform.id}
                variant={data.platform === platform.id ? "default" : "outline"}
                onClick={() => setData({ ...data, platform: platform.id })}
                className="rounded-full"
              >
                {platform.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Duration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {durations.map((duration) => (
              <Button
                key={duration}
                variant={data.duration === duration ? "default" : "outline"}
                onClick={() => setData({ ...data, duration })}
                className="flex-1"
              >
                {duration}s
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Aspect Ratio</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {aspectRatios.map((ratio) => {
              const Icon = ratio.icon
              return (
                <button
                  key={ratio.id}
                  onClick={() => setData({ ...data, aspectRatio: ratio.id })}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors",
                    data.aspectRatio === ratio.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50",
                  )}
                >
                  <Icon className="h-8 w-8 text-muted-foreground" />
                  <span className="text-sm font-medium">{ratio.label}</span>
                  <span className="text-xs text-muted-foreground">{ratio.sublabel}</span>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tone</CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={data.tone}
              onValueChange={(value) => setData({ ...data, tone: value as VideoConfig["tone"] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {tones.map((tone) => (
                  <SelectItem key={tone.id} value={tone.id}>
                    {tone.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Voice-Over Style</CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={data.voiceStyle}
              onValueChange={(value) => setData({ ...data, voiceStyle: value as VideoConfig["voiceStyle"] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {voiceStyles.map((style) => (
                  <SelectItem key={style.id} value={style.id}>
                    {style.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} className="gap-2 bg-transparent">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button onClick={() => onComplete(data)} className="gap-2">
          Generate Script
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
