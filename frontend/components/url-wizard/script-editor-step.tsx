"use client";

import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  GripVertical,
  Plus,
  ImageIcon,
  Clock,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { VideoScript, ScriptScene } from "@/lib/api-types";
import type { Scene } from "@/lib/types";

interface ScriptEditorStepProps {
  script: VideoScript;
  onComplete: (script: VideoScript) => void;
  onBack: () => void;
}

export function ScriptEditorStep({
  script,
  onComplete,
  onBack,
}: ScriptEditorStepProps) {
  const [data, setData] = useState<VideoScript>(script);
  const [selectedSceneId, setSelectedSceneId] = useState<string>(
    script.scenes[0]?.id ?? ""
  );

  const selectedScene = data.scenes.find((s) => s.id === selectedSceneId);

  const updateScene = (sceneId: string, updates: Partial<Scene>) => {
    setData({
      ...data,
      scenes: data.scenes.map((s) =>
        s.id === sceneId ? { ...s, ...updates } : s
      ),
    });
  };

  const addScene = () => {
    const newScene: ScriptScene = {
      id: `scene-${Date.now()}`,
      duration: 5,
      text: "New Scene",
      voiceOver: "",
      visuals: { type: "image", url: "", animation: "none" },
      order: 1,
      transition: "fade",
    };
    setData({ ...data, scenes: [...data.scenes, newScene] });
    setSelectedSceneId(newScene.id);
  };

  const getWordCount = (text: string) =>
    text.trim().split(/\s+/).filter(Boolean).length;
  const getEstimatedTime = (text: string, pacing: Scene["voiceOverPacing"]) => {
    const words = getWordCount(text);
    const wpm = pacing === "slow" ? 120 : pacing === "fast" ? 180 : 150;
    return Math.ceil((words / wpm) * 60);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold tracking-tight">
          Edit Your Script
        </h2>
        <p className="mt-1 text-muted-foreground">
          Customize scenes, text, and voice-over for each segment
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* Scene Timeline - Left Panel */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Scenes</CardTitle>
              <Badge variant="secondary">
                <Clock className="mr-1 h-3 w-3" />
                {data.totalDuration}s total
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.scenes.map((scene, index) => (
              <button
                key={scene.id}
                onClick={() => setSelectedSceneId(scene.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                  selectedSceneId === scene.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/50"
                )}
              >
                <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded bg-muted">
                  <img
                    src={scene.visuals?.url || "/placeholder.svg"}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {index + 1}. {scene.id}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {scene.duration}s
                  </p>
                </div>
              </button>
            ))}
            <Button
              variant="outline"
              className="w-full gap-2 bg-transparent"
              onClick={addScene}
            >
              <Plus className="h-4 w-4" />
              Add Scene
            </Button>
          </CardContent>
        </Card>

        {/* Scene Details - Right Panel */}
        {selectedScene && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                <Input
                  value={selectedScene.id ?? ""}
                  onChange={(e) =>
                    updateScene(selectedScene.id, { id: e.target.value })
                  }
                  className="h-auto border-none p-0 text-base font-semibold shadow-none focus-visible:ring-0"
                />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="text">
                <TabsList className="mb-4 w-full">
                  <TabsTrigger value="text" className="flex-1">
                    On-Screen Text
                  </TabsTrigger>
                  <TabsTrigger value="voiceover" className="flex-1">
                    Voice-Over
                  </TabsTrigger>
                  <TabsTrigger value="visuals" className="flex-1">
                    Visuals
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="text" className="space-y-4">
                  <div className="space-y-2">
                    <Label>Primary Text</Label>
                    <Input
                      value={selectedScene.text ?? ""}
                      onChange={(e) =>
                        updateScene(selectedScene.id, {
                          primaryText: e.target.value,
                        })
                      }
                      placeholder="Main headline text"
                    />
                  </div>
                  {/* <div className="space-y-2">
                    <Label>Primary Text</Label>
                    <Input
                      value={selectedScene.primaryText}
                      onChange={(e) =>
                        updateScene(selectedScene.id, {
                          primaryText: e.target.value,
                        })
                      }
                      placeholder="Main headline text"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Secondary Text (optional)</Label>
                    <Input
                      value={selectedScene.secondaryText || ""}
                      onChange={(e) =>
                        updateScene(selectedScene.id, {
                          secondaryText: e.target.value,
                        })
                      }
                      placeholder="Supporting text"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Text Style</Label>
                    <Select
                      value={selectedScene.textStyle}
                      onValueChange={(value) =>
                        updateScene(selectedScene.id, {
                          textStyle: value as Scene["textStyle"],
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="headline">Headline</SelectItem>
                        <SelectItem value="body">Body</SelectItem>
                        <SelectItem value="caption">Caption</SelectItem>
                        <SelectItem value="cta">Call to Action</SelectItem>
                      </SelectContent>
                    </Select>
                  </div> */}
                </TabsContent>

                <TabsContent value="voiceover" className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Voice-Over Script</Label>
                      <span className="text-xs text-muted-foreground">
                        {getWordCount(selectedScene.voiceOver ?? "")} words • ~
                        {getEstimatedTime(
                          selectedScene.voiceOver ?? "",
                          // selectedScene.voiceOverPacing ?? "normal"
                          "normal"
                        )}
                        s
                      </span>
                    </div>
                    <Textarea
                      value={selectedScene.voiceOver ?? ""}
                      onChange={(e) =>
                        updateScene(selectedScene.id, {
                          voiceOver: e.target.value,
                        })
                      }
                      placeholder="Enter voice-over script for this scene..."
                      rows={4}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Pacing</Label>
                    <div className="flex gap-2">
                      {(["slow", "normal", "fast"] as const).map((pacing) => (
                        <Button
                          key={pacing}
                          variant={
                            // (selectedScene.voiceOverPacing ?? "normal") ===
                            "normal" === pacing ? "default" : "outline"
                          }
                          size="sm"
                          onClick={() =>
                            updateScene(selectedScene.id, {
                              voiceOverPacing: pacing,
                            })
                          }
                          className="flex-1 capitalize"
                        >
                          {pacing}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 bg-transparent"
                  >
                    <Play className="h-4 w-4" />
                    Preview Voice-Over
                  </Button>
                </TabsContent>

                <TabsContent value="visuals" className="space-y-4">
                  <div className="space-y-2">
                    <Label>Scene Image</Label>
                    <div className="flex gap-4">
                      <div className="h-32 w-32 shrink-0 overflow-hidden rounded-lg border bg-muted">
                        <img
                          src={selectedScene.visuals?.url ?? "/placeholder.svg"}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="flex flex-col justify-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2 bg-transparent"
                        >
                          <ImageIcon className="h-4 w-4" />
                          Change Image
                        </Button>
                        <p className="text-xs text-muted-foreground">
                          Select from assets or upload new
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Transition</Label>
                      <Select
                        value={selectedScene.transition ?? "cut"}
                        onValueChange={(value) =>
                          updateScene(selectedScene.id, {
                            transition: value as Scene["transition"],
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cut">Cut</SelectItem>
                          <SelectItem value="fade">Fade</SelectItem>
                          <SelectItem value="slide">Slide</SelectItem>
                          <SelectItem value="zoom">Zoom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Animation</Label>
                      <Select
                        // value={selectedScene.animation ?? "none"}
                        value={"none"}
                        onValueChange={(value) =>
                          updateScene(selectedScene.id, {
                            animation: value as Scene["animation"],
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="ken-burns">Ken Burns</SelectItem>
                          <SelectItem value="parallax">Parallax</SelectItem>
                          <SelectItem value="fade-in">Fade In</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Duration</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={selectedScene.duration}
                        onChange={(e) =>
                          updateScene(selectedScene.id, {
                            duration: Number(e.target.value),
                          })
                        }
                        className="w-20"
                        min={1}
                        max={30}
                      />
                      <span className="text-sm text-muted-foreground">
                        seconds
                      </span>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}
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
        <Button onClick={() => onComplete(data)} className="gap-2">
          Continue
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
