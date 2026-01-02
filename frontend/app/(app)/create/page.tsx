"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Globe, Loader2, Sparkles, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AppHeader } from "@/components/app-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

type AnalysisStep = {
  id: string
  label: string
  status: "pending" | "loading" | "complete" | "error"
}

export default function CreatePage() {
  const router = useRouter()
  const [url, setUrl] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisComplete, setAnalysisComplete] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [analysisSteps, setAnalysisSteps] = useState<AnalysisStep[]>([
    { id: "fetch", label: "Fetching page content", status: "pending" },
    { id: "extract", label: "Extracting images & text", status: "pending" },
    { id: "analyze", label: "Analyzing brand elements", status: "pending" },
    { id: "generate", label: "Generating video scenes", status: "pending" },
    { id: "compose", label: "Composing final video", status: "pending" },
  ])
  const [extractedData, setExtractedData] = useState<{
    title: string
    description: string
    images: string[]
    colors: string[]
  } | null>(null)

  const updateStepStatus = (stepId: string, status: AnalysisStep["status"]) => {
    setAnalysisSteps((prev) => prev.map((step) => (step.id === stepId ? { ...step, status } : step)))
  }

  const simulateAnalysis = async () => {
    if (!url) {
      setError("Please enter a URL")
      return
    }

    // Basic URL validation
    try {
      new URL(url.startsWith("http") ? url : `https://${url}`)
    } catch {
      setError("Please enter a valid URL")
      return
    }

    setError(null)
    setIsAnalyzing(true)
    setProgress(0)

    // Simulate step-by-step analysis
    const steps = ["fetch", "extract", "analyze", "generate", "compose"]
    const progressPerStep = 100 / steps.length

    for (let i = 0; i < steps.length; i++) {
      updateStepStatus(steps[i], "loading")
      await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 600))
      updateStepStatus(steps[i], "complete")
      setProgress((i + 1) * progressPerStep)

      // After extraction, show extracted data
      if (steps[i] === "extract") {
        setExtractedData({
          title: "Summer Collection 2024",
          description: "Discover our latest fashion trends with up to 50% off selected items",
          images: [
            "/fashion-model-summer.png",
            "/summer-dress-product.png",
            "/beach-accessories.png",
            "/sunglasses-fashion.jpg",
          ],
          colors: ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4"],
        })
      }
    }

    setIsAnalyzing(false)
    setAnalysisComplete(true)
  }

  const proceedToEditor = () => {
    router.push("/editor/new")
  }

  return (
    <>
      <AppHeader title="Create New Ad" />
      <main className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-3xl">
          {/* Header */}
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-semibold tracking-tight">Create Video Ad from URL</h2>
            <p className="mt-1 text-muted-foreground">
              Enter a product or landing page URL and we&apos;ll automatically generate a video ad
            </p>
          </div>

          {/* URL Input Card */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Globe className="h-5 w-5 text-primary" />
                Enter Page URL
              </CardTitle>
              <CardDescription>
                Paste the URL of your product page, landing page, or any webpage you want to create an ad for
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="url">Website URL</Label>
                  <div className="flex gap-2">
                    <Input
                      id="url"
                      placeholder="https://example.com/product"
                      value={url}
                      onChange={(e) => {
                        setUrl(e.target.value)
                        setError(null)
                      }}
                      disabled={isAnalyzing}
                      className={cn(error && "border-destructive")}
                    />
                    <Button
                      onClick={simulateAnalysis}
                      disabled={isAnalyzing || !url || analysisComplete}
                      className="gap-2 shrink-0"
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Analyzing
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          Analyze & Generate
                        </>
                      )}
                    </Button>
                  </div>
                  {error && <p className="text-sm text-destructive">{error}</p>}
                </div>

                {/* Example URLs */}
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Try with example URLs:</p>
                  <div className="flex flex-wrap gap-2">
                    {["shopify.com/products/demo", "amazon.com/dp/example", "etsy.com/listing/example"].map(
                      (example) => (
                        <button
                          key={example}
                          onClick={() => setUrl(`https://${example}`)}
                          disabled={isAnalyzing}
                          className="rounded-md bg-background px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                        >
                          {example}
                        </button>
                      ),
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Analysis Progress */}
          {(isAnalyzing || analysisComplete) && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg">Analysis Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Progress value={progress} className="h-2" />
                <div className="space-y-2">
                  {analysisSteps.map((step) => (
                    <div key={step.id} className="flex items-center gap-3">
                      {step.status === "pending" && <div className="h-4 w-4 rounded-full border-2 border-muted" />}
                      {step.status === "loading" && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                      {step.status === "complete" && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                      {step.status === "error" && <AlertCircle className="h-4 w-4 text-destructive" />}
                      <span
                        className={cn(
                          "text-sm",
                          step.status === "pending" && "text-muted-foreground",
                          step.status === "loading" && "text-foreground font-medium",
                          step.status === "complete" && "text-foreground",
                          step.status === "error" && "text-destructive",
                        )}
                      >
                        {step.label}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Extracted Data Preview */}
          {extractedData && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg">Extracted Content</CardTitle>
                <CardDescription>We found these elements from your page</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Title</Label>
                  <p className="font-medium">{extractedData.title}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Description</Label>
                  <p className="text-sm text-muted-foreground">{extractedData.description}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Extracted Images</Label>
                  <div className="mt-2 flex gap-2">
                    {extractedData.images.map((img, i) => (
                      <div key={i} className="h-16 w-16 overflow-hidden rounded-lg border bg-muted">
                        <img
                          src={img || "/placeholder.svg"}
                          alt={`Extracted ${i + 1}`}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Brand Colors</Label>
                  <div className="mt-2 flex gap-2">
                    {extractedData.colors.map((color, i) => (
                      <div
                        key={i}
                        className="h-8 w-8 rounded-lg border"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Proceed to Editor */}
          {analysisComplete && (
            <div className="flex justify-center">
              <Button size="lg" onClick={proceedToEditor} className="gap-2">
                Open in Editor
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </main>
    </>
  )
}
