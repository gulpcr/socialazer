"use client"

import { useEffect, useCallback } from "react"

interface KeyboardShortcutsProps {
  onShortcut: (action: string) => void
  isPlaying: boolean
}

export function useKeyboardShortcuts({ onShortcut, isPlaying }: KeyboardShortcutsProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      const isMeta = e.metaKey || e.ctrlKey

      // Single key shortcuts
      if (!isMeta && !e.shiftKey && !e.altKey) {
        switch (e.key.toLowerCase()) {
          case "t":
            e.preventDefault()
            onShortcut("add-text")
            break
          case "i":
            e.preventDefault()
            onShortcut("add-image")
            break
          case "v":
            e.preventDefault()
            onShortcut("add-video")
            break
          case "a":
            e.preventDefault()
            onShortcut("add-audio")
            break
          case " ":
            e.preventDefault()
            onShortcut(isPlaying ? "pause" : "play")
            break
          case "delete":
          case "backspace":
            e.preventDefault()
            onShortcut("delete")
            break
          case "escape":
            e.preventDefault()
            onShortcut("deselect")
            break
          case "?":
            e.preventDefault()
            onShortcut("shortcuts")
            break
        }
      }

      // Meta + key shortcuts
      if (isMeta) {
        switch (e.key.toLowerCase()) {
          case "s":
            e.preventDefault()
            onShortcut("save")
            break
          case "e":
            e.preventDefault()
            onShortcut("export")
            break
          case "z":
            e.preventDefault()
            if (e.shiftKey) {
              onShortcut("redo")
            } else {
              onShortcut("undo")
            }
            break
          case "c":
            e.preventDefault()
            onShortcut("copy")
            break
          case "x":
            e.preventDefault()
            onShortcut("cut")
            break
          case "v":
            e.preventDefault()
            onShortcut("paste")
            break
          case "d":
            e.preventDefault()
            onShortcut("duplicate")
            break
          case "p":
            e.preventDefault()
            onShortcut("preview")
            break
        }
      }

      // Arrow keys for nudging
      if (
        !isMeta &&
        (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "ArrowLeft" || e.key === "ArrowRight")
      ) {
        e.preventDefault()
        const amount = e.shiftKey ? 10 : 1
        onShortcut(`nudge-${e.key.replace("Arrow", "").toLowerCase()}-${amount}`)
      }
    },
    [onShortcut, isPlaying],
  )

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])
}
