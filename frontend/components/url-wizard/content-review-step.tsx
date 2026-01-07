"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Upload, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { AnalysisResponse } from "@/lib/api-types";

interface ContentReviewStepProps {
  analysis: AnalysisResponse;
  onComplete: (analysis: AnalysisResponse) => void;
  onBack: () => void;
}

export function ContentReviewStep({
  analysis,
  onComplete,
  onBack,
}: ContentReviewStepProps) {
  const [data, setData] = useState<AnalysisResponse>(analysis);
  // console.log("Review Step Data:", data);
  const updateHeadline = (index: number, included: boolean) => {
    const currentHeadlines = data.extractedContent?.headlines ?? [];
    const newHeadlines = [...currentHeadlines];
    newHeadlines[index] = { ...newHeadlines[index], included };
    setData({
      ...data,
      extractedContent: {
        ...(data.extractedContent ?? {}),
        headlines: newHeadlines,
      },
    });
  };

  const toggleImage = (index: number) => {
    const currentImages = data.media?.images ?? [];
    const newImages = [...currentImages];
    const existing = newImages[index] ?? {
      url: "",
      selected: false,
      relevance: "low",
    };
    newImages[index] = {
      ...existing,
      selected: !existing.selected,
    };
    setData({ ...data, media: { ...(data.media ?? {}), images: newImages } });
  };

  const relevanceColors = {
    high: "bg-green-500/10 text-green-700 border-green-500/20",
    medium: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
    low: "bg-red-500/10 text-red-700 border-red-500/20",
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold tracking-tight">
          Review Extracted Content
        </h2>
        <p className="mt-1 text-muted-foreground">
          Edit and refine the content we found on your page
        </p>
      </div>

      {/* Page Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-lg">
            Page Summary
            <Badge variant="outline">{data.extractedContent?.pageType}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={data.extractedContent?.title}
              onChange={(e) =>
                setData({
                  ...data,
                  extractedContent: {
                    ...data.extractedContent,
                    title: e.target.value,
                  },
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={data.extractedContent?.description}
              onChange={(e) =>
                setData({
                  ...data,
                  extractedContent: {
                    ...data.extractedContent,
                    description: e.target.value,
                  },
                })
              }
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Key Messages */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Key Messages</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Headlines (select to include)</Label>
            <div className="space-y-2">
              {(data.extractedContent?.headlines ?? []).map(
                (headline, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 rounded-lg border p-3"
                  >
                    <Checkbox
                      checked={!!headline.included}
                      onCheckedChange={(checked) =>
                        updateHeadline(index, checked as boolean)
                      }
                    />
                    <span
                      className={cn(
                        "text-sm",
                        !headline.included &&
                          "text-muted-foreground line-through"
                      )}
                    >
                      {headline.text}
                    </span>
                  </div>
                )
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="valueProposition">Value Proposition</Label>
            <Textarea
              id="valueProposition"
              value={data.extractedContent?.valueProposition ?? ""}
              onChange={(e) =>
                setData({
                  ...data,
                  extractedContent: {
                    ...(data.extractedContent ?? {}),
                    valueProposition: e.target.value,
                  },
                })
              }
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="targetAudience">Target Audience</Label>
            <Input
              id="targetAudience"
              value={data.extractedContent?.targetAudience ?? ""}
              onChange={(e) =>
                setData({
                  ...data,
                  extractedContent: {
                    ...(data.extractedContent ?? {}),
                    targetAudience: e.target.value,
                  },
                })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Extracted Images */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-lg">
            Extracted Images
            <Button
              variant="outline"
              size="sm"
              className="gap-2 bg-transparent"
            >
              <Upload className="h-4 w-4" />
              Upload More
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
            {(data.media?.images ?? []).map((image, index) => (
              <button
                key={index}
                onClick={() => toggleImage(index)}
                className={cn(
                  "group relative aspect-square overflow-hidden rounded-lg border-2 transition-all",
                  image.selected
                    ? "border-primary"
                    : "border-transparent opacity-50"
                )}
              >
                <img
                  src={image.url || "/placeholder.svg"}
                  alt={`Extracted ${index + 1}`}
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <Badge
                  className={cn(
                    "absolute right-1 top-1 text-[10px]",
                    relevanceColors[
                      (image.relevance ?? "") as keyof typeof relevanceColors
                    ] ?? ""
                  )}
                >
                  {image.relevance}
                </Badge>
                <div
                  className={cn(
                    "absolute inset-0 flex items-center justify-center bg-black/50 transition-opacity",
                    image.selected
                      ? "opacity-100"
                      : "opacity-0 group-hover:opacity-100"
                  )}
                >
                  {image.selected ? (
                    <Check className="h-6 w-6 text-white" />
                  ) : (
                    <X className="h-6 w-6 text-white" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Brand Elements */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Brand Elements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Detected Colors</Label>
            <div className="flex gap-2">
              {(data.branding?.colors ?? []).map((color, i) => (
                <div
                  key={i}
                  className="h-10 w-10 rounded-lg border shadow-sm"
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="brandName">Brand Name</Label>
            <Input
              id="brandName"
              value={data.branding?.brandName ?? ""}
              onChange={(e) =>
                setData({
                  ...data,
                  branding: {
                    ...(data.branding ?? {}),
                    brandName: e.target.value,
                  },
                })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={onBack}
          className="gap-2 bg-transparent"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button onClick={() => onComplete(data)} className="gap-2">
          Continue
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
