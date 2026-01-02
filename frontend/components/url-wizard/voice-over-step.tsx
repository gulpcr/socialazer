"use client"

import { useState } from "react"
import { ArrowLeft, ArrowRight, Play, Pause, RefreshCw, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import type { VideoScript, VoicePreset } from "@/lib/types"

interface VoiceOverStepProps {
  script: VideoScript
  onComplete: (voice: VoicePreset, audioUrl: string) => void
  onBack: () => void
}

const voices: VoicePreset[] = [
  { id: "v1", name: "Sarah", gender: "female", language: "English (US)", provider: "elevenlabs" },
  { id: "v2", name: "Michael", gender: "male", language: "English (US)", provider: "elevenlabs" },
  { id: "v3", name: "Emma", gender: "female", language: "English (UK)", provider: "elevenlabs" },
  { id: "v4", name: "James", gender: "male", language: "English (UK)", provider: "google" },
  { id: "v5", name: "Sofia", gender: "female", language: "Spanish", provider: "google" },
  { id: "v6", name: "Alex", gender: "neutral", language: "English (US)", provider: "google" },
]

export function VoiceOverStep({ script, onComplete, onBack }: VoiceOverStepProps) {
  const [provider, setProvider] = useState<"elevenlabs" | "google">("elevenlabs")
  const [selectedVoice, setSelectedVoice] = useState<VoicePreset | null>(null)
  const [stability, setStability] = useState([75])
  const [similarity, setSimilarity] = useState([75])
  const [isGenerating, setIsGenerating] = useState(false)
  const [isGenerated, setIsGenerated] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)

  const filteredVoices = voices.filter((v) => v.provider === provider)

  const fullScript = script.scenes.map((s) => s.voiceOver).join(" ")

  const generateVoiceOver = async () => {
    if (!selectedVoice) return
    setIsGenerating(true)
    // Simulate generation
    await new Promise((resolve) => setTimeout(resolve, 2000))
    setIsGenerating(false)
    setIsGenerated(true)
  }

  const handleUseVoice = () => {
    if (selectedVoice) {
      onComplete(selectedVoice, "/mock-audio.mp3")
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold tracking-tight">Generate Voice-Over</h2>
        <p className="mt-1 text-muted-foreground">Select a voice and generate audio for your video</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Voice Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Select Voice</CardTitle>
            <Tabs value={provider} onValueChange={(v) => setProvider(v as typeof provider)}>
              <TabsList className="w-full">
                <TabsTrigger value="elevenlabs" className="flex-1">
                  ElevenLabs
                </TabsTrigger>
                <TabsTrigger value="google" className="flex-1">
                  Google TTS
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent className="space-y-3">
            {filteredVoices.map((voice) => (
              <button
                key={voice.id}
                onClick={() => setSelectedVoice(voice)}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors",
                  selectedVoice?.id === voice.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50",
                )}
              >
                <div>
                  <p className="font-medium">{voice.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {voice.gender} • {voice.language}
                  </p>
                </div>
                <Button size="sm" variant="ghost" className="gap-1">
                  <Play className="h-3 w-3" />
                  Preview
                </Button>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Voice Settings & Generate */}
        <div className="space-y-6">
          {provider === "elevenlabs" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Voice Settings</CardTitle>
                <CardDescription>Fine-tune the voice output</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Stability</Label>
                    <span className="text-sm text-muted-foreground">{stability[0]}%</span>
                  </div>
                  <Slider value={stability} onValueChange={setStability} max={100} step={1} />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Similarity</Label>
                    <span className="text-sm text-muted-foreground">{similarity[0]}%</span>
                  </div>
                  <Slider value={similarity} onValueChange={setSimilarity} max={100} step={1} />
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Full Script Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-32 overflow-y-auto rounded-lg bg-muted/50 p-3 text-sm">{fullScript}</div>
              <p className="mt-2 text-xs text-muted-foreground">
                {fullScript.split(/\s+/).length} words • ~{Math.ceil((fullScript.split(/\s+/).length / 150) * 60)}s
                duration
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <Button
                onClick={generateVoiceOver}
                disabled={!selectedVoice || isGenerating}
                className="w-full gap-2"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating Voice-Over...
                  </>
                ) : (
                  "Generate Voice-Over"
                )}
              </Button>

              {isGenerated && (
                <div className="mt-4 space-y-3">
                  <div className="flex items-center gap-3 rounded-lg border p-3">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-10 w-10 shrink-0 rounded-full p-0 bg-transparent"
                      onClick={() => setIsPlaying(!isPlaying)}
                    >
                      {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                    <div className="flex-1">
                      <div className="h-8 rounded bg-muted">
                        {/* Waveform visualization placeholder */}
                        <div className="flex h-full items-center justify-center gap-0.5 px-2">
                          {Array.from({ length: 40 }).map((_, i) => (
                            <div
                              key={i}
                              className="w-1 rounded-full bg-primary/60"
                              style={{ height: `${Math.random() * 100}%` }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    <span className="text-sm text-muted-foreground">0:32</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 gap-2 bg-transparent"
                      onClick={() => setIsGenerated(false)}
                    >
                      <RefreshCw className="h-4 w-4" />
                      Regenerate
                    </Button>
                    <Button className="flex-1" onClick={handleUseVoice}>
                      Use This Voice
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} className="gap-2 bg-transparent">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button onClick={handleUseVoice} disabled={!isGenerated} className="gap-2">
          Continue
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
