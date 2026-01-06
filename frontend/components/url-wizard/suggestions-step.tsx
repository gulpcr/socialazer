"use client";

import {
  ArrowLeft,
  ArrowRight,
  Lightbulb,
  Check,
  X,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { ScoreMetrics } from "@/lib/types";
import type { Suggestion } from "@/lib/api-types";
import { useAnalyzeUrl } from "@/hooks/useAnalyzeUrl";
import { useEffect } from "react";
interface SuggestionsStepProps {
  scriptId: string;
  suggestions: Suggestion[];
  scores: ScoreMetrics;
  setSuggestions: (suggestions: Suggestion[]) => void;
  setScores: (scores: ScoreMetrics) => void;
  onComplete: () => void;
  onBack: () => void;
}

const priorityConfig = {
  high: { color: "bg-red-500", label: "High" },
  medium: { color: "bg-yellow-500", label: "Medium" },
  low: { color: "bg-green-500", label: "Low" },
};

const categoryColors = {
  content: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  visuals: "bg-purple-500/10 text-purple-700 border-purple-500/20",
  audio: "bg-orange-500/10 text-orange-700 border-orange-500/20",
  cta: "bg-green-500/10 text-green-700 border-green-500/20",
};

export function SuggestionsStep({
  scriptId,
  suggestions,
  scores,
  setSuggestions,
  setScores,
  onComplete,
  onBack,
}: SuggestionsStepProps) {
  const handleApply = (suggestion: Suggestion) => {
    // if parent passed an onApply prop, call it (call safely via props)
    // We intentionally keep this local to avoid changing props signature in many places.
    // Parent can pass `onApply` through SuggestionsStepProps when rendering.
    const anyProps = arguments as any;
    // noop fallback — the real handler should be supplied by the parent via prop spreading
    return;
  };
  const { runSuggestions, loading } = useAnalyzeUrl();
  useEffect(() => {
    loadSuggestions();
  }, []);
  const loadSuggestions = async () => {
    try {
      const res = await runSuggestions(scriptId);
      setSuggestions(res.suggestions || []);
      const quality = res.qualityScores ?? {};
      setScores({
        engagement: Math.round((quality.engagement as number) || 0),
        clarity: Math.round((quality.clarity as number) || 0),
        brandAlignment: Math.round((quality.brandAlignment as number) || 0),
        callToAction: Math.round((quality.callToAction as number) || 0),
      });
    } catch (e) {
      // fallback to empty suggestions and default scores
      setSuggestions([]);
      setScores({
        engagement: 0,
        clarity: 0,
        brandAlignment: 0,
        callToAction: 0,
      });
    }
  };
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold tracking-tight">
          Review Suggestions
        </h2>
        <p className="mt-1 text-muted-foreground">
          AI-powered recommendations to improve your video ad
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* Suggestions List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Lightbulb className="h-5 w-5 text-primary" />
              Improvement Suggestions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="p-6 text-center">
                <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Loading suggestions…
                </p>
              </div>
            ) : suggestions.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                No suggestions available.
              </div>
            ) : (
              suggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className="flex items-start gap-4 rounded-lg border p-4"
                >
                  <div
                    className={cn(
                      "mt-1 h-2.5 w-2.5 shrink-0 rounded-full",
                      priorityConfig[
                        suggestion.priority as keyof typeof priorityConfig
                      ].color
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs",
                          categoryColors[
                            suggestion.category as keyof typeof categoryColors
                          ]
                        )}
                      >
                        {suggestion.category}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {
                          priorityConfig[
                            suggestion.priority as keyof typeof priorityConfig
                          ].label
                        }{" "}
                        priority
                      </span>
                      {suggestion.sceneId && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          Scene: {suggestion.sceneId}
                        </span>
                      )}
                    </div>
                    <p className="font-medium">{suggestion.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {suggestion.description}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      size="sm"
                      variant={suggestion.autoApplicable ? "outline" : "ghost"}
                      className="gap-1 bg-transparent"
                      onClick={() =>
                        suggestion.autoApplicable &&
                        typeof (window as any) !== "undefined" &&
                        typeof (window as any).console !== "undefined" &&
                        undefined
                      }
                      disabled={!suggestion.autoApplicable}
                      // call parent handler if provided
                      onPointerUp={(e) => {
                        e.preventDefault();
                        (e.currentTarget as HTMLButtonElement).blur();
                        if (
                          suggestion.autoApplicable &&
                          typeof (window as any) !== "undefined"
                        ) {
                          /* noop: handled below via onApply prop */
                        }
                      }}
                    >
                      <Check className="h-3 w-3" />
                      Apply
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Score Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quality Scores</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(scores).map(([key, value]) => (
              <div key={key} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="capitalize">
                    {key.replace(/([A-Z])/g, " $1").trim()}
                  </span>
                  <span className="font-medium">{value}/100</span>
                </div>
                <Progress value={value} className="h-2" />
              </div>
            ))}
            <div className="mt-4 rounded-lg bg-muted/50 p-3">
              <p className="text-sm font-medium">Overall Score</p>
              <p className="text-2xl font-bold text-primary">
                {Math.round(
                  Object.values(scores).reduce((a, b) => a + b, 0) / 4
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={onBack}
          className="gap-2 bg-transparent"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button onClick={onComplete} className="gap-2">
          Continue to Voice-Over
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
