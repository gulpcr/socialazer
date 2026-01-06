'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, Loader2, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Progress } from '@/components/ui/progress'

export type AnalysisPhase =
  | 'fetching'
  | 'extracting'
  | 'summarizing'
  | 'structuring'
  | 'finalizing'

const PHASES: { key: AnalysisPhase; label: string }[] = [
  { key: 'fetching', label: 'Fetching webpage content' },
  { key: 'extracting', label: 'Extracting key sections' },
  { key: 'summarizing', label: 'Summarizing content' },
  { key: 'structuring', label: 'Structuring video narrative' },
  { key: 'finalizing', label: 'Finalizing analysis' },
]

interface AnalysisLoaderProps {
  loading: boolean
  error?: string | null
  className?: string
}

export function AnalysisLoader({
  loading,
  error,
  className,
}: AnalysisLoaderProps) {
  const [activeIndex, setActiveIndex] = useState(-1)
  const [stopped, setStopped] = useState(false)

  // Progress phases while loading
  useEffect(() => {
    if (!loading || error) return

    setStopped(false)
    setActiveIndex(0)

    const interval = setInterval(() => {
      setActiveIndex((prev) =>
        prev < PHASES.length - 1 ? prev + 1 : prev
      )
    }, 900)

    return () => clearInterval(interval)
  }, [loading, error])

  // Stop immediately on API error
  useEffect(() => {
    if (error) {
      setStopped(true)
    }
  }, [error])

  if (!loading && !error) return null

  return (
    <div className={cn('m-4 space-y-4', className)}>
      {PHASES.map((phase, index) => {
        const isCompleted = index < activeIndex && !stopped
        const isActive = index === activeIndex && !stopped
        const isError = stopped && index === activeIndex

        const progressValue = isCompleted
          ? 100
          : isActive
          ? 65
          : 0

        return (
          <div key={phase.key} className="space-y-1">
            {/* Label row */}
            <div className="flex items-center gap-2 text-sm">
              {isCompleted && (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              )}
              {isActive && (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              )}
              {isError && (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
              {!isCompleted && !isActive && !isError && (
                <div className="h-4 w-4 rounded-full border border-muted-foreground/40" />
              )}

              <span
                className={cn(
                  isCompleted && 'text-muted-foreground',
                  isActive && 'font-medium text-foreground',
                  isError && 'font-medium text-red-500'
                )}
              >
                {phase.label}
              </span>
            </div>

            {/* Progress bar */}
            <div className='mx-6 w-2/3'>

            <Progress value={progressValue} />
            </div>
          </div>
        )
      })
}
      {error && (
        <p className="pt-2 text-sm text-red-500">
          Analysis failed. Please try again.
        </p>
      )}
    </div>
  )
}
