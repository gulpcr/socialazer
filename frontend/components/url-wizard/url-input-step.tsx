"use client"

import { useState } from "react"
import { Globe, Loader2, Sparkles, CheckCircle2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import type { URLAnalysis } from "@/lib/types"

type AnalysisStep = {
  id: string
  label: string
  status: "pending" | "loading" | "complete" | "error"
}

interface URLInputStepProps {
  onComplete: (analysis: URLAnalysis) => void
}

export function URLInputStep({ onComplete }: URLInputStepProps) {
  const [url, setUrl] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [analysisSteps, setAnalysisSteps] = useState<AnalysisStep[]>([
    { id: "fetch", label: "Fetching page content", status: "pending" },
    { id: "extract", label: "Extracting images & text", status: "pending" },
    { id: "analyze", label: "Analyzing brand elements", status: "pending" },
    { id: "generate", label: "Generating content structure", status: "pending" },
  ])

  const updateStepStatus = (stepId: string, status: AnalysisStep["status"]) => {
    setAnalysisSteps((prev) => prev.map((step) => (step.id === stepId ? { ...step, status } : step)))
  }

  const analyzeURL = async () => {
    if (!url) {
      setError("Please enter a URL")
      return
    }

    try {
      new URL(url.startsWith("http") ? url : `https://${url}`)
    } catch {
      setError("Please enter a valid URL")
      return
    }

    setError(null)
    setIsAnalyzing(true)
    setProgress(0)

    const steps = ["fetch", "extract", "analyze", "generate"]
    const progressPerStep = 100 / steps.length

    for (let i = 0; i < steps.length; i++) {
      updateStepStatus(steps[i], "loading")
      await new Promise((resolve) => setTimeout(resolve, 600 + Math.random() * 400))
      updateStepStatus(steps[i], "complete")
      setProgress((i + 1) * progressPerStep)
    }

    // Mock analysis result
    const mockAnalysis: URLAnalysis = {
      id: "analysis-1",
      url: url,
      title: "Summer Collection 2024",
      description:
        "Discover our latest fashion trends with premium quality materials and modern designs. Up to 50% off selected items for a limited time.",
      pageType: "product",
      headlines: [
        { text: "Summer Collection 2024 - New Arrivals", included: true },
        { text: "Premium Quality, Affordable Prices", included: true },
        { text: "Free Shipping on Orders Over $50", included: true },
        { text: "Limited Time Offer", included: false },
      ],
      valueProposition:
        "Transform your wardrobe with our curated summer collection featuring sustainable materials and timeless designs.",
      targetAudience: "Fashion-conscious millennials and Gen Z looking for trendy, affordable clothing",
      images: [
        { url: "/fashion-model-summer.png", relevance: "high", selected: true },
        { url: "/summer-dress-product.png", relevance: "high", selected: true },
        { url: "/beach-accessories.png", relevance: "medium", selected: true },
        { url: "/sunglasses-fashion.jpg", relevance: "medium", selected: false },
        { url: "/summer-hat-straw.jpg", relevance: "low", selected: false },
      ],
      brandColors: ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7"],
      brandName: "StyleHub",
    }

    setIsAnalyzing(false)
    onComplete(mockAnalysis)
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold tracking-tight">Turn any webpage into a video ad</h2>
        <p className="mt-1 text-muted-foreground">Enter your product page, landing page, or any URL to get started</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Globe className="h-5 w-5 text-primary" />
            Enter Page URL
          </CardTitle>
          <CardDescription>
            We'll analyze the page content and extract key information for your video ad
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
              <Button onClick={analyzeURL} disabled={isAnalyzing || !url} className="gap-2 shrink-0">
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyzing
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Analyze Page
                  </>
                )}
              </Button>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <div className="rounded-lg bg-muted/50 p-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Try with example URLs:</p>
            <div className="flex flex-wrap gap-2">
              {["shopify.com/products/demo", "amazon.com/dp/example", "etsy.com/listing/example"].map((example) => (
                <button
                  key={example}
                  onClick={() => setUrl(`https://${example}`)}
                  disabled={isAnalyzing}
                  className="rounded-md bg-background px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {isAnalyzing && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Analyzing Page</CardTitle>
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
    </div>
  )
}
