"use client"

import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface Step {
  id: number
  name: string
  description: string
}

interface WizardProgressProps {
  steps: Step[]
  currentStep: number
  onStepClick: (step: number) => void
}

export function WizardProgress({ steps, currentStep, onStepClick }: WizardProgressProps) {
  return (
    <nav aria-label="Progress">
      <ol className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isComplete = step.id < currentStep
          const isCurrent = step.id === currentStep
          const isClickable = step.id < currentStep

          return (
            <li key={step.id} className="relative flex flex-1 flex-col items-center">
              {index > 0 && (
                <div
                  className={cn(
                    "absolute left-0 right-1/2 top-4 h-0.5 -translate-y-1/2",
                    isComplete || isCurrent ? "bg-primary" : "bg-border",
                  )}
                />
              )}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "absolute left-1/2 right-0 top-4 h-0.5 -translate-y-1/2",
                    isComplete ? "bg-primary" : "bg-border",
                  )}
                />
              )}
              <button
                onClick={() => isClickable && onStepClick(step.id)}
                disabled={!isClickable}
                className={cn(
                  "relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-medium transition-colors",
                  isComplete && "border-primary bg-primary text-primary-foreground",
                  isCurrent && "border-primary bg-background text-primary",
                  !isComplete && !isCurrent && "border-border bg-background text-muted-foreground",
                  isClickable && "cursor-pointer hover:bg-primary/10",
                )}
              >
                {isComplete ? <Check className="h-4 w-4" /> : step.id}
              </button>
              <div className="mt-2 text-center">
                <p className={cn("text-xs font-medium", isCurrent ? "text-foreground" : "text-muted-foreground")}>
                  {step.name}
                </p>
              </div>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
