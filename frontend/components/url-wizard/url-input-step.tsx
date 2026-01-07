"use client";

import { useState } from "react";
import {
  Globe,
  Loader2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { AnalysisResponse } from "@/lib/api-types";
import { useAnalyzeUrl } from "@/hooks/useAnalyzeUrl";
import { AnalysisLoader } from "./analysis-loader";

// type AnalysisStep = {
//   id: string
//   label: string
//   status: "pending" | "loading" | "complete" | "error"
// }

interface URLInputStepProps {
  onComplete: (analysis: AnalysisResponse) => void;
}

export function URLInputStep({ onComplete }: URLInputStepProps) {
  const [url, setUrl] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  // const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null);
  // const [analysisSteps, setAnalysisSteps] = useState<AnalysisStep[]>([
  //   { id: "fetch", label: "Fetching page content", status: "pending" },
  //   { id: "extract", label: "Extracting images & text", status: "pending" },
  //   { id: "analyze", label: "Analyzing brand elements", status: "pending" },
  //   { id: "generate", label: "Generating content structure", status: "pending" },
  // ])

  // const updateStepStatus = (stepId: string, status: AnalysisStep["status"]) => {
  //   setAnalysisSteps((prev) => prev.map((step) => (step.id === stepId ? { ...step, status } : step)))
  // }

  const { runAnalyze } = useAnalyzeUrl();

  const analyzeURL = async () => {
    if (!url) {
      setError("Please enter a URL");
      return;
    }

    try {
      new URL(url.startsWith("http") ? url : `https://${url}`);
    } catch {
      setError("Please enter a valid URL");
      return;
    }

    setError(null);
    setIsAnalyzing(true);
    // setProgress(0)

    // const steps = ["fetch", "extract", "analyze", "generate"]
    // const progressPerStep = 100 / steps.length

    // for (let i = 0; i < steps.length; i++) {
    //   updateStepStatus(steps[i], "loading")
    //   await new Promise((resolve) => setTimeout(resolve, 600 + Math.random() * 400))
    //   updateStepStatus(steps[i], "complete")
    //   setProgress((i + 1) * progressPerStep)
    // }
    // call API analyze endpoint and map response to URLAnalysis
    try {
      const res = await runAnalyze(url);
      const mapped: AnalysisResponse = {
        id: res.id,
        url: res.url,
        status: res.status,
        extractedContent: res.extractedContent,
        media: res.media,
        branding: res.branding,
      };
      setIsAnalyzing(false);
      onComplete(mapped);
    } catch (e: any) {
      setIsAnalyzing(false);
      setError(e?.message || "Failed to analyze URL");
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold tracking-tight">
          Turn any webpage into a video ad
        </h2>
        <p className="mt-1 text-muted-foreground">
          Enter your product page, landing page, or any URL to get started
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Globe className="h-5 w-5 text-primary" />
            Enter Page URL
          </CardTitle>
          <CardDescription>
            We'll analyze the page content and extract key information for your
            video ad
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
                  setUrl(e.target.value);
                  setError(null);
                }}
                disabled={isAnalyzing}
                className={cn(error && "border-destructive")}
              />
              <Button
                onClick={analyzeURL}
                disabled={isAnalyzing || !url}
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
                    Analyze Page
                  </>
                )}
              </Button>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <div className="rounded-lg bg-muted/50 p-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Try with example URLs:
            </p>
            <div className="flex flex-wrap gap-2">
              {["buypass.ai", "buyshop.ai", "example.com"].map((example) => (
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
          {/* <CardContent className="space-y-4">
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
          </CardContent> */}
          <AnalysisLoader loading={isAnalyzing} error={error} />
        </Card>
      )}
    </div>
  );
}
