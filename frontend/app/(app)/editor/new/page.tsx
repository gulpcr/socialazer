"use client"

import { useState, Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ArrowLeft, Save, Download, Undo, Redo, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EditorCanvas } from "@/components/editor/editor-canvas"
import { EditorSidebar } from "@/components/editor/editor-sidebar"
import { PropertiesPanel } from "@/components/editor/properties-panel"
import { ExportModal } from "@/components/export-modal"
import { mockTemplates } from "@/lib/mock-data"

function NewEditorContent() {
  const searchParams = useSearchParams()
  const templateId = searchParams.get("template")
  const template = mockTemplates.find((t) => t.id === templateId)

  const [aspectRatio, setAspectRatio] = useState<"9:16" | "1:1" | "16:9">(template?.formats[0] || "9:16")
  const [exportOpen, setExportOpen] = useState(false)

  return (
    <div className="flex h-screen flex-col">
      {/* Editor Header */}
      <header className="flex h-14 items-center justify-between border-b bg-card px-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/templates">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-sm font-medium">{template ? `New Ad - ${template.name}` : "New Ad"}</h1>
            <p className="text-xs text-muted-foreground">Unsaved</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-1 sm:flex">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Undo className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Redo className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="ghost" size="sm" className="gap-2">
            <Eye className="h-4 w-4" />
            <span className="hidden sm:inline">Preview</span>
          </Button>
          <Button variant="outline" size="sm" className="gap-2 bg-transparent">
            <Save className="h-4 w-4" />
            <span className="hidden sm:inline">Save</span>
          </Button>
          <Button size="sm" className="gap-2" onClick={() => setExportOpen(true)}>
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>
        </div>
      </header>

      {/* Editor Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Controls */}
        <div className="hidden w-72 lg:block">
          <EditorSidebar />
        </div>

        {/* Center - Canvas */}
        <div className="flex-1">
          <EditorCanvas aspectRatio={aspectRatio} onAspectRatioChange={setAspectRatio} />
        </div>

        {/* Right Sidebar - Properties */}
        <div className="hidden w-64 xl:block">
          <PropertiesPanel />
        </div>
      </div>

      <ExportModal open={exportOpen} onOpenChange={setExportOpen} />
    </div>
  )
}

export default function NewEditorPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading...</div>}>
      <NewEditorContent />
    </Suspense>
  )
}
