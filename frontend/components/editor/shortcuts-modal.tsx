"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface ShortcutsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const shortcutGroups = [
  {
    title: "Add Elements",
    shortcuts: [
      { key: "T", description: "Add Text" },
      { key: "I", description: "Add Image" },
      { key: "V", description: "Add Video" },
      { key: "A", description: "Add Audio" },
    ],
  },
  {
    title: "Edit",
    shortcuts: [
      { key: "⌘ Z", description: "Undo" },
      { key: "⌘ ⇧ Z", description: "Redo" },
      { key: "⌘ C", description: "Copy" },
      { key: "⌘ X", description: "Cut" },
      { key: "⌘ V", description: "Paste" },
      { key: "⌘ D", description: "Duplicate" },
      { key: "⌫", description: "Delete" },
    ],
  },
  {
    title: "Navigation",
    shortcuts: [
      { key: "↑↓←→", description: "Nudge element (1px)" },
      { key: "⇧ + ↑↓←→", description: "Nudge element (10px)" },
      { key: "Esc", description: "Deselect" },
    ],
  },
  {
    title: "Playback",
    shortcuts: [
      { key: "Space", description: "Play/Pause" },
      { key: "⌘ P", description: "Preview" },
    ],
  },
  {
    title: "Project",
    shortcuts: [
      { key: "⌘ S", description: "Save" },
      { key: "⌘ E", description: "Export" },
      { key: "⌘ K", description: "Command Palette" },
      { key: "?", description: "Show Shortcuts" },
    ],
  },
]

export function ShortcutsModal({ open, onOpenChange }: ShortcutsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-6 py-4">
          {shortcutGroups.map((group) => (
            <div key={group.title} className="space-y-3">
              <h3 className="text-sm font-semibold">{group.title}</h3>
              <div className="space-y-2">
                {group.shortcuts.map((shortcut) => (
                  <div key={shortcut.key} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{shortcut.description}</span>
                    <kbd className="rounded bg-muted px-2 py-1 text-xs font-mono">{shortcut.key}</kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
