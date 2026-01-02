"use client"

import { useState } from "react"
import { Download, Copy, Check, Loader2, X, Settings2, Sparkles } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

interface ExportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type ExportStatus = "idle" | "rendering" | "complete" | "failed"

const qualityPresets = [
  { id: "draft", name: "Draft", description: "Fast preview, lower quality", fps: 24, bitrate: "2M" },
  { id: "standard", name: "Standard", description: "Balanced quality and speed", fps: 30, bitrate: "5M" },
  { id: "high", name: "High", description: "Best quality for publishing", fps: 30, bitrate: "10M" },
  { id: "ultra", name: "Ultra", description: "Maximum quality, larger file", fps: 60, bitrate: "20M" },
]

const resolutionOptions = {
  "9:16": [
    { label: "1080x1920 (Full HD)", value: "1080x1920" },
    { label: "720x1280 (HD)", value: "720x1280" },
    { label: "540x960 (SD)", value: "540x960" },
  ],
  "1:1": [
    { label: "1080x1080 (Full HD)", value: "1080x1080" },
    { label: "720x720 (HD)", value: "720x720" },
    { label: "540x540 (SD)", value: "540x540" },
  ],
  "16:9": [
    { label: "1920x1080 (Full HD)", value: "1920x1080" },
    { label: "1280x720 (HD)", value: "1280x720" },
    { label: "960x540 (SD)", value: "960x540" },
  ],
}

export function ExportModal({ open, onOpenChange }: ExportModalProps) {
  const [format, setFormat] = useState<"mp4" | "webm" | "gif" | "png">("mp4")
  const [aspectRatios, setAspectRatios] = useState<string[]>(["9:16"])
  const [quality, setQuality] = useState("standard")
  const [resolution, setResolution] = useState("1080x1920")
  const [includeAudio, setIncludeAudio] = useState(true)
  const [status, setStatus] = useState<ExportStatus>("idle")
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState("")
  const [copied, setCopied] = useState(false)
  const [exportedFiles, setExportedFiles] = useState<{ name: string; size: string; url: string }[]>([])

  const handleRender = () => {
    setStatus("rendering")
    setProgress(0)
    setExportedFiles([])

    const steps = ["Preparing assets...", "Rendering frames...", "Encoding video...", "Optimizing...", "Finalizing..."]
    let stepIndex = 0

    setCurrentStep(steps[0])

    const interval = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev + 5

        // Update step based on progress
        const newStepIndex = Math.floor((newProgress / 100) * steps.length)
        if (newStepIndex !== stepIndex && newStepIndex < steps.length) {
          stepIndex = newStepIndex
          setCurrentStep(steps[stepIndex])
        }

        if (newProgress >= 100) {
          clearInterval(interval)
          setStatus("complete")
          setExportedFiles([
            { name: "summer-sale-9x16.mp4", size: "4.2 MB", url: "https://cdn.adstudio.com/exports/12345-9x16.mp4" },
          ])
          return 100
        }
        return newProgress
      })
    }, 200)
  }

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleClose = () => {
    setStatus("idle")
    setProgress(0)
    setCurrentStep("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Export Ad</DialogTitle>
          <DialogDescription>Configure your export settings and render your video</DialogDescription>
        </DialogHeader>

        {status === "idle" && (
          <Tabs defaultValue="format" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="format" className="flex-1">
                Format
              </TabsTrigger>
              <TabsTrigger value="quality" className="flex-1">
                Quality
              </TabsTrigger>
              <TabsTrigger value="options" className="flex-1">
                Options
              </TabsTrigger>
            </TabsList>

            <TabsContent value="format" className="space-y-4 mt-4">
              <div className="space-y-3">
                <Label>Output Format</Label>
                <RadioGroup
                  value={format}
                  onValueChange={(v) => setFormat(v as typeof format)}
                  className="grid grid-cols-2 gap-2"
                >
                  {[
                    { value: "mp4", label: "MP4 Video", desc: "Best compatibility" },
                    { value: "webm", label: "WebM Video", desc: "Modern browsers" },
                    { value: "gif", label: "GIF Animation", desc: "No audio, loops" },
                    { value: "png", label: "PNG Sequence", desc: "Image frames" },
                  ].map((opt) => (
                    <div key={opt.value}>
                      <RadioGroupItem value={opt.value} id={opt.value} className="peer sr-only" />
                      <Label
                        htmlFor={opt.value}
                        className={cn(
                          "flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 cursor-pointer transition-colors",
                          "hover:bg-muted/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5",
                        )}
                      >
                        <span className="text-sm font-medium">{opt.label}</span>
                        <span className="text-xs text-muted-foreground">{opt.desc}</span>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <div className="space-y-3">
                <Label>Aspect Ratios</Label>
                <div className="flex gap-2">
                  {(["9:16", "1:1", "16:9"] as const).map((ratio) => (
                    <div
                      key={ratio}
                      onClick={() => {
                        setAspectRatios(
                          aspectRatios.includes(ratio)
                            ? aspectRatios.filter((r) => r !== ratio)
                            : [...aspectRatios, ratio],
                        )
                      }}
                      className={cn(
                        "flex-1 rounded-lg border-2 p-3 cursor-pointer transition-colors text-center",
                        aspectRatios.includes(ratio) ? "border-primary bg-primary/5" : "border-muted hover:bg-muted/50",
                      )}
                    >
                      <div
                        className={cn(
                          "mx-auto mb-2 bg-muted rounded",
                          ratio === "9:16" && "w-4 h-7",
                          ratio === "1:1" && "w-6 h-6",
                          ratio === "16:9" && "w-8 h-5",
                        )}
                      />
                      <span className="text-xs font-medium">{ratio}</span>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="quality" className="space-y-4 mt-4">
              <div className="space-y-3">
                <Label>Quality Preset</Label>
                <RadioGroup value={quality} onValueChange={setQuality} className="space-y-2">
                  {qualityPresets.map((preset) => (
                    <div key={preset.id}>
                      <RadioGroupItem value={preset.id} id={preset.id} className="peer sr-only" />
                      <Label
                        htmlFor={preset.id}
                        className={cn(
                          "flex items-center justify-between rounded-lg border-2 border-muted bg-popover p-3 cursor-pointer transition-colors",
                          "hover:bg-muted/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5",
                        )}
                      >
                        <div>
                          <span className="text-sm font-medium">{preset.name}</span>
                          <p className="text-xs text-muted-foreground">{preset.description}</p>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          <p>{preset.fps} FPS</p>
                          <p>{preset.bitrate}</p>
                        </div>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label>Resolution</Label>
                <Select value={resolution} onValueChange={setResolution}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {resolutionOptions[aspectRatios[0] as keyof typeof resolutionOptions]?.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="options" className="space-y-4 mt-4">
              <div className="space-y-3">
                <Label>Audio</Label>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="audio"
                    checked={includeAudio}
                    onCheckedChange={(checked) => setIncludeAudio(checked as boolean)}
                    disabled={format === "gif" || format === "png"}
                  />
                  <Label htmlFor="audio" className="font-normal">
                    Include audio track
                  </Label>
                </div>
                {(format === "gif" || format === "png") && (
                  <p className="text-xs text-muted-foreground">Audio not available for {format.toUpperCase()} format</p>
                )}
              </div>

              <div className="rounded-lg bg-muted/50 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Export Summary</span>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>
                    Format: <strong>{format.toUpperCase()}</strong>
                  </p>
                  <p>
                    Ratios: <strong>{aspectRatios.join(", ")}</strong>
                  </p>
                  <p>
                    Quality: <strong>{qualityPresets.find((p) => p.id === quality)?.name}</strong>
                  </p>
                  <p>
                    Resolution: <strong>{resolution}</strong>
                  </p>
                  <p>
                    Estimated size: <strong>~4-8 MB</strong>
                  </p>
                </div>
              </div>
            </TabsContent>

            <div className="mt-6">
              <Button onClick={handleRender} disabled={aspectRatios.length === 0} className="w-full gap-2">
                <Sparkles className="h-4 w-4" />
                Start Render
              </Button>
            </div>
          </Tabs>
        )}

        {status === "rendering" && (
          <div className="space-y-4 py-6">
            <div className="flex items-center justify-center">
              <div className="relative">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-medium">{progress}%</span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-center text-sm text-muted-foreground">{currentStep}</p>
            </div>
            <p className="text-center text-xs text-muted-foreground">
              Rendering {aspectRatios.length} version{aspectRatios.length > 1 ? "s" : ""} at{" "}
              {qualityPresets.find((p) => p.id === quality)?.name.toLowerCase()} quality
            </p>
          </div>
        )}

        {status === "complete" && (
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-center">
              <div className="rounded-full bg-green-500/20 p-3">
                <Check className="h-6 w-6 text-green-500" />
              </div>
            </div>
            <p className="text-center font-medium">Export Complete!</p>

            <div className="space-y-2">
              {exportedFiles.map((file, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
                  <div>
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{file.size}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handleCopyUrl(file.url)}>
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                    <Button size="sm" className="h-8 gap-1">
                      <Download className="h-3 w-3" />
                      Download
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 bg-transparent" onClick={handleClose}>
                Close
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  setStatus("idle")
                  setProgress(0)
                }}
              >
                Export Another
              </Button>
            </div>
          </div>
        )}

        {status === "failed" && (
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-center">
              <div className="rounded-full bg-destructive/20 p-3">
                <X className="h-6 w-6 text-destructive" />
              </div>
            </div>
            <p className="text-center font-medium">Export Failed</p>
            <p className="text-center text-sm text-muted-foreground">
              Something went wrong during rendering. Please try again.
            </p>
            <Button onClick={() => setStatus("idle")} className="w-full">
              Try Again
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
