"use client";

import React, { useState, useEffect, useRef } from "react";
import { CDN_BASE } from "@/lib/api-client";
import {
  ArrowLeft,
  ArrowRight,
  Play,
  Pause,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type {
  VideoScript,
  VoicePreset,
  VoiceOver,
  VoiceOverResponse,
  VoiceOverRequest,
} from "@/lib/api-types";
import { useVoiceOver } from "@/hooks/useVoiceOver";

interface VoiceOverStepProps {
  script: VideoScript;
  onComplete: (voice: VoicePreset, voiceRes: VoiceOver) => void;
  onBack: () => void;
}

export function VoiceOverStep({
  script,
  onComplete,
  onBack,
}: VoiceOverStepProps) {
  // Cleanup preview audio on unmount
  useEffect(() => {
    return () => {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
    };
  }, []);

  const { loading, generating, error, getVoiceOverPresets, voiceOverGeneration } =
    useVoiceOver();

  const loadVoicePresets = async () => {
    try {
      const res = await getVoiceOverPresets();
      setVoices(res.presets);
    } catch (e) {
      console.error("Failed to load voice presets", e);
    }
  };

  // Load voice presets on mount
  useEffect(() => {
    loadVoicePresets();
  }, []);

  const [voices, setVoices] = useState<VoicePreset[]>([]);
  const [provider, setProvider] = useState<"elevenlabs" | "google">(
    "elevenlabs"
  );
  const [selectedVoice, setSelectedVoice] = useState<VoicePreset | null>(null);
  const [settings, setSettings] = useState<Record<string, number>>({
    speed: 1.0,
    pitch: 1.0,
    stability: 0.75,
    clarity: 0.85,
  });

  const [voiceover, setVoiceOver] = useState<VoiceOverRequest | null>(null);
  const [generatedResponse, setGeneratedResponse] = useState<VoiceOver | null>(
    null
  );
  const [isGenerated, setIsGenerated] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [waveform, setWaveform] = useState<number[] | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playingPreviewId, setPlayingPreviewId] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  const filteredVoices = voices.filter((v) => v.provider === provider);

  const fullScript = script.scenes.map((s) => s.voiceOver).join(" ");

  const generateVoiceOver = async () => {
    if (!selectedVoice) return;
    const payload: VoiceOverRequest = {
      text: fullScript,
      voiceId: selectedVoice.id,
      provider,
      settings,
    };
    setVoiceOver(payload);
    try {
      const res = await voiceOverGeneration(payload);
      setGeneratedResponse(res as VoiceOver);
      setIsGenerated(true);
    } catch (e) {
      console.error("Voice over generation failed", e);
    }
  };

  // When a new generatedResponse arrives, create an Audio element and load waveform
  useEffect(() => {
    console.log("New generated response:", generatedResponse);
    if (!generatedResponse?.audioUrl) return;

    let cancelled = false;

    // resolve audio URL against CDN_BASE if it's relative
    const resolvedUrl =
      generatedResponse.audioUrl.startsWith("http") ||
      generatedResponse.audioUrl.startsWith("//")
        ? generatedResponse.audioUrl
        : `${CDN_BASE.replace(/\/$/, "")}${generatedResponse.audioUrl.startsWith("/") ? "" : "/"}${generatedResponse.audioUrl}`;

    // create audio element
    const audio = new Audio(resolvedUrl);
    audioRef.current = audio;
    audio.onended = () => setIsPlaying(false);

    // decode audio to get waveform data
    const ac = new (window.AudioContext || (window as any).webkitAudioContext)();
    fetch(resolvedUrl)
      .then((r) => r.arrayBuffer())
      .then((buf) => ac.decodeAudioData(buf))
      .then((audioBuffer) => {
        if (cancelled) return;
        const channelData = audioBuffer.getChannelData(0);
        const samples = 120; // number of bars
        const blockSize = Math.floor(channelData.length / samples) || 1;
        const data = new Array(samples).fill(0).map((_, i) => {
          let sum = 0;
          const start = i * blockSize;
          const end = Math.min(start + blockSize, channelData.length);
          for (let j = start; j < end; j++) sum += Math.abs(channelData[j]);
          return sum / (end - start || 1);
        });
        setWaveform(data);
      })
      .catch((e) => console.error("Failed to decode audio for waveform", e));

    return () => {
      cancelled = true;
      audio.pause();
      audioRef.current = null;
      try {
        ac.close();
      } catch {}
    };
  }, [generatedResponse]);

  // Control audio play/pause
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.play().catch((e) => console.error(e));
    } else {
      audio.pause();
    }
  }, [isPlaying]);

  // Track progress while playing
  useEffect(() => {
    let raf: number | null = null;
    const step = () => {
      const audio = audioRef.current;
      if (audio && generatedResponse) {
        const dur = audio.duration || generatedResponse.duration || 1;
        const cur = audio.currentTime || 0;
        setProgress(Math.min(1, cur / dur));
        setCurrentTime(cur);
      }
      raf = requestAnimationFrame(step);
    };
    if (isPlaying) raf = requestAnimationFrame(step);
    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, [isPlaying, generatedResponse]);

  // Draw waveform to canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !waveform) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const playedBars = Math.floor(progress * waveform.length);
    const barWidth = canvas.width / waveform.length;
    const bgColor = getComputedStyle(document.documentElement).getPropertyValue("--muted-foreground") || "#94A3B8";
    const primary = "#0EA5A4"; // fallback primary color

    for (let i = 0; i < waveform.length; i++) {
      const h = waveform[i] * canvas.height * 0.9;
      const x = i * barWidth;
      ctx.fillStyle = i <= playedBars ? primary : "rgba(148,163,184,0.5)";
      ctx.fillRect(x + barWidth * 0.1, (canvas.height - h) / 2, barWidth * 0.8, h);
    }
  }, [waveform, progress]);

  const formatHMS = (seconds?: number) => {
    const total = Math.floor(seconds || 0);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s
      .toString()
      .padStart(2, "0")}`;
  };

  const handleWaveformClick = (e: React.MouseEvent) => {
    if (!canvasRef.current || !audioRef.current || !generatedResponse) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const frac = Math.max(0, Math.min(1, x / rect.width));
    const dur = audioRef.current.duration || generatedResponse.duration || 1;
    audioRef.current.currentTime = frac * dur;
    setProgress(frac);
    setIsPlaying(true);
  };

  const handleUseVoice = () => {
    if (selectedVoice && generatedResponse) {
      onComplete(selectedVoice, generatedResponse);
    }
  };

  const handlePreview = (voice: VoicePreset) => {
    if (!voice.previewUrl) return;

    if (playingPreviewId === voice.id) {
      // Stop
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current.currentTime = 0;
      }
      setPlayingPreviewId(null);
    } else {
      // Play new
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
      const audio = new Audio(voice.previewUrl);
      audio.onended = () => setPlayingPreviewId(null);
      audio.play().catch(console.error);
      previewAudioRef.current = audio;
      setPlayingPreviewId(voice.id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold tracking-tight">
          Generate Voice-Over
        </h2>
        <p className="mt-1 text-muted-foreground">
          Select a voice and generate audio for your video
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Voice Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Select Voice</CardTitle>
            <Tabs
              value={provider}
              onValueChange={(v) => setProvider(v as typeof provider)}
            >
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
            {loading && (
              <div className="p-6 text-center">
                <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Loading voices…
                </p>
              </div>
            )}
            {filteredVoices.map((voice) => (
              <div
                key={voice.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedVoice(voice)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedVoice(voice);
                  }
                }}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors cursor-pointer",
                  selectedVoice?.id === voice.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/50"
                )}
              >
                <div>
                  <p className="font-medium">{voice.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {voice.gender} • {voice.language}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-1"
                  disabled={!voice.previewUrl}
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePreview(voice);
                  }}
                >
                  {playingPreviewId === voice.id ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                  {playingPreviewId === voice.id ? "Stop" : "Preview"}
                </Button>
              </div>
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
                    <Label>Speed</Label>
                    <span className="text-sm text-muted-foreground">
                      {settings.speed.toFixed(2)}x
                    </span>
                  </div>
                  <Slider
                    value={[settings.speed]}
                    onValueChange={(value) =>
                      setSettings({ ...settings, speed: Number(value[0]) })
                    }
                    min={0.5}
                    max={2.0}
                    step={0.01}
                  />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Pitch</Label>
                    <span className="text-sm text-muted-foreground">
                      {settings.pitch.toFixed(2)}x
                    </span>
                  </div>
                  <Slider
                    value={[settings.pitch]}
                    onValueChange={(value) =>
                      setSettings({ ...settings, pitch: Number(value[0]) })
                    }
                    min={0.5}
                    max={2.0}
                    step={0.01}
                  />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Stability</Label>
                    <span className="text-sm text-muted-foreground">
                      {Math.round(settings.stability * 100)}%
                    </span>
                  </div>
                  <Slider
                    value={[settings.stability]}
                    onValueChange={(value) =>
                      setSettings({ ...settings, stability: Number(value[0]) })
                    }
                    min={0}
                    max={1}
                    step={0.01}
                  />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Clarity</Label>
                    <span className="text-sm text-muted-foreground">
                      {Math.round(settings.clarity * 100)}%
                    </span>
                  </div>
                  <Slider
                    value={[settings.clarity]}
                    onValueChange={(value) =>
                      setSettings({ ...settings, clarity: Number(value[0]) })
                    }
                    min={0}
                    max={1}
                    step={0.01}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Full Script Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-32 overflow-y-auto rounded-lg bg-muted/50 p-3 text-sm">
                {fullScript}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {fullScript.split(/\s+/).length} words • ~
                {Math.ceil((fullScript.split(/\s+/).length / 150) * 60)}s
                duration
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <Button
                onClick={generateVoiceOver}
                disabled={!selectedVoice || generating}
                className="w-full gap-2"
                size="lg"
              >
                {generating ? (
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
                  <div className="flex items-center gap-2 rounded-lg border p-3">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 w-8 shrink-0 rounded-full p-0 bg-transparent"
                      onClick={() => setIsPlaying(!isPlaying)}
                    >
                      {isPlaying ? (
                        <Pause className="h-3 w-3" />
                      ) : (
                        <Play className="h-3 w-3" />
                      )}
                    </Button>
                    <div className="flex-1">
                        <div className="h-8 rounded bg-muted">
                          {waveform ? (
                            <canvas
                              ref={canvasRef}
                              className="w-full h-full"
                              onClick={handleWaveformClick}
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center gap-0.5 px-2">
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            </div>
                          )}
                        </div>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {generatedResponse ? (
                        `${formatHMS(currentTime)} / ${formatHMS(
                          audioRef.current?.duration || generatedResponse.duration
                        )}`
                      ) : (
                        "00:00:00 / 00:00:32"
                      )}
                    </span>
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
        <Button
          variant="outline"
          onClick={onBack}
          className="gap-2 bg-transparent"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={handleUseVoice}
          disabled={!isGenerated}
          className="gap-2"
        >
          Continue
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
