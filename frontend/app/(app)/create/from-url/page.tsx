"use client";

import { useState } from "react";
import { AppHeader } from "@/components/app-header";
import { URLInputStep } from "@/components/url-wizard/url-input-step";
import { ContentReviewStep } from "@/components/url-wizard/content-review-step";
import { VideoConfigStep } from "@/components/url-wizard/video-config-step";
import { ScriptEditorStep } from "@/components/url-wizard/script-editor-step";
import { SuggestionsStep } from "@/components/url-wizard/suggestions-step";
import { VoiceOverStep } from "@/components/url-wizard/voice-over-step";
import { HandoffStep } from "@/components/url-wizard/handoff-step";
import { WizardProgress } from "@/components/url-wizard/wizard-progress";
import type { ScoreMetrics, VoicePreset } from "@/lib/types";
import {
  AnalysisResponse,
  VideoConfig,
  VideoScript,
  Suggestion,
  VoiceOver,
  VoiceOverResponse,
} from "@/lib/api-types";
import { useAnalyzeUrl } from "@/hooks/useAnalyzeUrl";

const STEPS = [
  { id: 1, name: "URL Input", description: "Enter webpage URL" },
  { id: 2, name: "Review Content", description: "Edit extracted content" },
  { id: 3, name: "Configuration", description: "Set video preferences" },
  { id: 4, name: "Script Editor", description: "Edit scenes & script" },
  { id: 5, name: "Suggestions", description: "Review improvements" },
  { id: 6, name: "Voice-Over", description: "Generate audio" },
  { id: 7, name: "Handoff", description: "Open in editor" },
];

export default function CreateFromURLPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [config, setConfig] = useState<VideoConfig>({
    analysisId: analysis?.id || undefined,
    config: {
      platform: "instagram",
      duration: 30,
      aspectRatio: "9:16",
      tone: "professional",
      voiceStyle: "conversational",
    },
  });
  const [script, setScript] = useState<VideoScript | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [scores, setScores] = useState<ScoreMetrics>({
    engagement: 0,
    clarity: 0,
    brandAlignment: 0,
    callToAction: 0,
  });
  const [selectedVoice, setSelectedVoice] = useState<VoicePreset | null>(null);
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(
    null
  );

  const handleURLAnalyzed = (data: AnalysisResponse) => {
    setAnalysis(data);
    setConfig((prev) => ({
      ...prev,
      analysisId: data.id,
    }));
    setCurrentStep(2);
  };

  const handleContentReviewed = (data: AnalysisResponse) => {
    setAnalysis(data);
    setConfig((prev) => ({
      ...prev,
      analysisId: data.id,
    }));
    setCurrentStep(3);
  };

  const handleConfigured = (
    data: VideoConfig,
    generatedScript?: VideoScript
  ) => {
    setConfig(data);
    if (generatedScript) {
      setScript(generatedScript);
    }
    setCurrentStep(4);
  };

  const handleScriptEdited = async (data: VideoScript) => {
    setScript(data);
    setCurrentStep(5);
  };

  const handleSuggestionsReviewed = () => {
    setCurrentStep(6);
  };

  const handleVoiceGenerated = (voice: VoicePreset, voiceRes: VoiceOver) => {
    setSelectedVoice(voice);
    setGeneratedAudioUrl(voiceRes.audioUrl);
    setCurrentStep(7);
  };

  return (
    <>
      <AppHeader title="Create from URL" />
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-5xl p-6">
          <WizardProgress
            steps={STEPS}
            currentStep={currentStep}
            onStepClick={setCurrentStep}
          />

          <div className="mt-8">
            {currentStep === 1 && (
              <URLInputStep onComplete={handleURLAnalyzed} />
            )}
            {currentStep === 2 && analysis && (
              <ContentReviewStep
                analysis={analysis}
                onComplete={handleContentReviewed}
                onBack={() => setCurrentStep(1)}
              />
            )}
            {currentStep === 3 && analysis && (
              <VideoConfigStep
                config={config}
                // analysisId={analysis.id}
                onComplete={handleConfigured}
                onBack={() => setCurrentStep(2)}
              />
            )}
            {currentStep === 4 && script && (
              <ScriptEditorStep
                script={script}
                onComplete={handleScriptEdited}
                onBack={() => setCurrentStep(3)}
              />
            )}
            {currentStep === 5 && script && (
              <SuggestionsStep
                scriptId={script.id}
                suggestions={suggestions}
                scores={scores}
                setSuggestions={setSuggestions}
                setScores={setScores}
                onComplete={handleSuggestionsReviewed}
                onBack={() => setCurrentStep(4)}
              />
            )}
            {currentStep === 6 && script && (
              <VoiceOverStep
                script={script}
                onComplete={handleVoiceGenerated}
                onBack={() => setCurrentStep(5)}
              />
            )}
            {currentStep === 7 && script && (
              <HandoffStep
                script={script}
                voice={selectedVoice}
                audioUrl={generatedAudioUrl}
                onBack={() => setCurrentStep(6)}
              />
            )}
          </div>
        </div>
      </main>
    </>
  );
}

// function generateMockScript(
//   analysis: AnalysisResponse,
//   config: VideoConfig
// ): VideoScript {
//   const sceneDuration = config.duration / 4;
//   return {
//     id: "script-1",
//     analysisId: analysis.id,
//     totalDuration: config.duration,
//     scenes: [
//       {
//         id: "scene-1",
//         name: "Hook",
//         duration: sceneDuration,
//         primaryText: analysis.headlines[0]?.text || "Attention!",
//         textStyle: "headline",
//         voiceOver: `${analysis.valueProposition}`,
//         voiceOverPacing: "normal",
//         imageUrl: analysis.images[0]?.url || "/diverse-products-still-life.png",
//         transition: "fade",
//         animation: "ken-burns",
//       },
//       {
//         id: "scene-2",
//         name: "Problem",
//         duration: sceneDuration,
//         primaryText: "The Challenge",
//         secondaryText: "What you've been missing",
//         textStyle: "body",
//         voiceOver: `Are you tired of the same old solutions? ${analysis.title} changes everything.`,
//         voiceOverPacing: "normal",
//         imageUrl: analysis.images[1]?.url || "/problem.jpg",
//         transition: "slide",
//         animation: "parallax",
//       },
//       {
//         id: "scene-3",
//         name: "Solution",
//         duration: sceneDuration,
//         primaryText: analysis.title,
//         secondaryText: analysis.description.slice(0, 50),
//         textStyle: "headline",
//         voiceOver: analysis.description,
//         voiceOverPacing: "normal",
//         imageUrl: analysis.images[2]?.url || "/abstract-solution.png",
//         transition: "zoom",
//         animation: "fade-in",
//       },
//       {
//         id: "scene-4",
//         name: "CTA",
//         duration: sceneDuration,
//         primaryText: "Get Started Now",
//         secondaryText: "Limited time offer",
//         textStyle: "cta",
//         voiceOver:
//           "Don't wait. Click the link below and transform your experience today!",
//         voiceOverPacing: "fast",
//         imageUrl: analysis.images[3]?.url || "/call-to-action-button.png",
//         transition: "fade",
//         animation: "none",
//       },
//     ],
//   };
// }

// Suggestions are now fetched from the API via `useAnalyzeUrl().runSuggestions`.
