"use client"

import { useState } from "react"
import { Play, RefreshCw, Trash2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { mockVoices } from "@/lib/mock-data"

export function VoiceOverPanel() {
  const [script, setScript] = useState(
    "Summer Sale is here! Get up to 50% off on all your favorite items. Shop now and save big!",
  )
  const [selectedVoice, setSelectedVoice] = useState(mockVoices[0].id)
  const [isGenerating, setIsGenerating] = useState(false)
  const [hasAudio, setHasAudio] = useState(false)

  const handleGenerate = () => {
    setIsGenerating(true)
    // Simulate API call
    setTimeout(() => {
      setIsGenerating(false)
      setHasAudio(true)
    }, 2000)
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Voice-over Script</Label>
        <Textarea
          value={script}
          onChange={(e) => setScript(e.target.value)}
          placeholder="Enter your voice-over script..."
          rows={4}
        />
        <p className="text-xs text-muted-foreground">{script.length} characters</p>
      </div>

      <div className="space-y-2">
        <Label>Voice</Label>
        <Select value={selectedVoice} onValueChange={setSelectedVoice}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {mockVoices.map((voice) => (
              <SelectItem key={voice.id} value={voice.id}>
                {voice.name} ({voice.language})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button onClick={handleGenerate} disabled={isGenerating || !script.trim()} className="w-full gap-2">
        {isGenerating ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <RefreshCw className="h-4 w-4" />
            Generate Voice-over
          </>
        )}
      </Button>

      {hasAudio && (
        <div className="rounded-lg border bg-muted/50 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium">Generated Audio</span>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <Play className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive">
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <div className="h-8 rounded bg-muted">
            {/* Audio waveform placeholder */}
            <div className="flex h-full items-center justify-center gap-0.5">
              {Array.from({ length: 30 }).map((_, i) => (
                <div key={i} className="w-1 rounded-full bg-primary/50" style={{ height: `${Math.random() * 100}%` }} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
