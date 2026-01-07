"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Film,
  Clock,
  ImageIcon,
  Mic,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { VideoScript, VoicePreset } from "@/lib/api-types";
import { useReelGeneration } from "@/hooks/useReelGeneration";

interface HandoffStepProps {
  script: VideoScript;
  voice: VoicePreset | null;
  audioUrl: string | null;
  onBack: () => void;
}

export function HandoffStep({
  script,
  voice,
  audioUrl,
  onBack,
}: HandoffStepProps) {
  const totalAssets = script.scenes.length;
  const assetsReady = script.scenes.filter((s) => s.visuals?.url).length;
  const { loading, error, reelGeneration } = useReelGeneration();

  const handleGenerateReel = async () => {
    try {
      const reel = await reelGeneration();
      console.log("Reel generated:", reel);
    } catch (e) {
      console.error("Error generating reel:", e);
    }
  };
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold tracking-tight">Ready to Edit</h2>
        <p className="mt-1 text-muted-foreground">
          Your video is prepared and ready to open in the visual editor
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Video Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center gap-3 rounded-lg border p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Film className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{script.scenes.length}</p>
                <p className="text-sm text-muted-foreground">Scenes</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-semibold">
                  {script.totalDuration}s
                </p>
                <p className="text-sm text-muted-foreground">Duration</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <ImageIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-semibold">
                  {assetsReady}/{totalAssets}
                </p>
                <p className="text-sm text-muted-foreground">Assets Ready</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Mic className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{voice ? "Yes" : "No"}</p>
                <p className="text-sm text-muted-foreground">Voice-Over</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">What&apos;s Included</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { label: "Scene timeline with transitions", ready: true },
              { label: "On-screen text for all scenes", ready: true },
              {
                label: "Background images/visuals",
                ready: assetsReady === totalAssets,
              },
              { label: "Voice-over audio", ready: !!audioUrl },
              { label: "Animation presets applied", ready: true },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <CheckCircle2
                  className={`h-5 w-5 ${
                    item.ready ? "text-green-500" : "text-muted-foreground"
                  }`}
                />
                <span className={item.ready ? "" : "text-muted-foreground"}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={onBack}
          className="gap-2 bg-transparent"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        {loading ? (
          <Button size="lg" disabled>
            Generating Reel...
          </Button>
        ) : (
          <Button asChild size="lg" onClick={handleGenerateReel}>
            <Link href="/editor/new">Generate Reel</Link>
            Generate Reel
          </Button>
        )}
      </div>
    </div>
  );
}
