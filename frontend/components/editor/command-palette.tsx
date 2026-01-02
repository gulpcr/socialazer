"use client"

import { useEffect, useState, useCallback } from "react"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"
import {
  Type,
  ImageIcon,
  Video,
  Music,
  Save,
  Download,
  Eye,
  Undo,
  Redo,
  Trash2,
  Copy,
  Scissors,
  ClipboardPaste,
  Sparkles,
  Maximize2,
  Play,
  Pause,
  Layers,
  Settings,
  HelpCircle,
} from "lucide-react"

interface CommandPaletteProps {
  onCommand: (command: string) => void
}

export function CommandPalette({ onCommand }: CommandPaletteProps) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const runCommand = useCallback(
    (command: string) => {
      setOpen(false)
      onCommand(command)
    },
    [onCommand],
  )

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Add Elements">
          <CommandItem onSelect={() => runCommand("add-text")}>
            <Type className="mr-2 h-4 w-4" />
            Add Text
            <CommandShortcut>T</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runCommand("add-image")}>
            <ImageIcon className="mr-2 h-4 w-4" />
            Add Image
            <CommandShortcut>I</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runCommand("add-video")}>
            <Video className="mr-2 h-4 w-4" />
            Add Video Clip
            <CommandShortcut>V</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runCommand("add-audio")}>
            <Music className="mr-2 h-4 w-4" />
            Add Audio
            <CommandShortcut>A</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Edit">
          <CommandItem onSelect={() => runCommand("undo")}>
            <Undo className="mr-2 h-4 w-4" />
            Undo
            <CommandShortcut>⌘Z</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runCommand("redo")}>
            <Redo className="mr-2 h-4 w-4" />
            Redo
            <CommandShortcut>⌘⇧Z</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runCommand("copy")}>
            <Copy className="mr-2 h-4 w-4" />
            Copy
            <CommandShortcut>⌘C</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runCommand("cut")}>
            <Scissors className="mr-2 h-4 w-4" />
            Cut
            <CommandShortcut>⌘X</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runCommand("paste")}>
            <ClipboardPaste className="mr-2 h-4 w-4" />
            Paste
            <CommandShortcut>⌘V</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runCommand("delete")}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Selected
            <CommandShortcut>⌫</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="AI Actions">
          <CommandItem onSelect={() => runCommand("ai-magic-resize")}>
            <Maximize2 className="mr-2 h-4 w-4" />
            Magic Resize to All Formats
          </CommandItem>
          <CommandItem onSelect={() => runCommand("ai-smart-headline")}>
            <Sparkles className="mr-2 h-4 w-4" />
            Generate Smart Headlines
          </CommandItem>
          <CommandItem onSelect={() => runCommand("ai-auto-captions")}>
            <Sparkles className="mr-2 h-4 w-4" />
            Generate Auto Captions
          </CommandItem>
          <CommandItem onSelect={() => runCommand("ai-enhance")}>
            <Sparkles className="mr-2 h-4 w-4" />
            AI Enhance Selected
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Playback">
          <CommandItem onSelect={() => runCommand("play")}>
            <Play className="mr-2 h-4 w-4" />
            Play
            <CommandShortcut>Space</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runCommand("pause")}>
            <Pause className="mr-2 h-4 w-4" />
            Pause
            <CommandShortcut>Space</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runCommand("preview")}>
            <Eye className="mr-2 h-4 w-4" />
            Preview
            <CommandShortcut>⌘P</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Project">
          <CommandItem onSelect={() => runCommand("save")}>
            <Save className="mr-2 h-4 w-4" />
            Save Project
            <CommandShortcut>⌘S</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runCommand("export")}>
            <Download className="mr-2 h-4 w-4" />
            Export
            <CommandShortcut>⌘E</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runCommand("layers")}>
            <Layers className="mr-2 h-4 w-4" />
            Toggle Layers Panel
          </CommandItem>
          <CommandItem onSelect={() => runCommand("settings")}>
            <Settings className="mr-2 h-4 w-4" />
            Project Settings
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Help">
          <CommandItem onSelect={() => runCommand("shortcuts")}>
            <HelpCircle className="mr-2 h-4 w-4" />
            Keyboard Shortcuts
            <CommandShortcut>?</CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
