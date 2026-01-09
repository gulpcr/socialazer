"use client"

import { useState, useCallback, useEffect } from "react"
import Link from "next/link"
import { ArrowLeft, Save, Download, Undo, Redo, Eye, Command, Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EditorCanvas } from "@/components/editor/editor-canvas"
import { EditorSidebar } from "@/components/editor/editor-sidebar"
import { PropertiesPanel } from "@/components/editor/properties-panel"
import { Timeline } from "@/components/editor/timeline"
import { ExportModal } from "@/components/export-modal"
import { SceneNavigator } from "@/components/editor/scene-navigator"
import { AIActionsPanel } from "@/components/editor/ai-actions-panel"
import { CommandPalette } from "@/components/editor/command-palette"
import { ShortcutsModal } from "@/components/editor/shortcuts-modal"
import { useKeyboardShortcuts } from "@/components/editor/keyboard-shortcuts"
import { useProjects } from "@/hooks/useProjects"
import { useToast } from "@/hooks/use-toast"
import type { Layer, LayerType } from "@/lib/editor-types"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

const mockScenes = [
  { id: "1", name: "Intro", thumbnail: "", duration: 3 },
  { id: "2", name: "Product Showcase", thumbnail: "", duration: 5 },
  { id: "3", name: "Features", thumbnail: "", duration: 4 },
  { id: "4", name: "CTA", thumbnail: "", duration: 3 },
]

export default function EditorPage({ params }: { params: { id: string } }) {
  const { fetch, updateLayers, add, remove, reorder } = useProjects()
  const { toast } = useToast()
  const [layers, setLayers] = useState<Layer[]>([])
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null)
  const [aspectRatio, setAspectRatio] = useState<"9:16" | "1:1" | "16:9">("9:16")
  const [exportOpen, setExportOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [scenes, setScenes] = useState<Array<{ id: string; name: string; thumbnail: string; duration: number }>>([])
  const [activeSceneId, setActiveSceneId] = useState("1")
  const [projectName, setProjectName] = useState("")

  useEffect(() => {
    loadProject()
  }, [params.id])

  const loadProject = async () => {
    try {
      const project = await fetch(params.id)
      setProjectName(project.name)
      setLayers(project.layers || [])
      setAspectRatio(project.config?.aspectRatio || "9:16")
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load project.",
        variant: "destructive",
      })
    }
  }

  const saveProject = async () => {
    try {
      await updateLayers(params.id, layers)
      toast({
        title: "Project saved",
        description: "Your changes have been saved successfully.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save project.",
        variant: "destructive",
      })
    }
  }

  const selectedLayer = layers.find((l) => l.id === selectedLayerId) || null

  const handleLayerUpdate = useCallback((layerId: string, updates: Partial<Layer>) => {
    setLayers((prev) => prev.map((layer) => (layer.id === layerId ? { ...layer, ...updates } : layer)))
  }, [])

  const handleLayerDelete = useCallback(
    async (layerId: string) => {
      setLayers((prev) => prev.filter((layer) => layer.id !== layerId))
      if (selectedLayerId === layerId) {
        setSelectedLayerId(null)
      }

      try {
        await remove(params.id, layerId)
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete layer.",
          variant: "destructive",
        })
      }
    },
    [selectedLayerId, params.id, remove, toast],
  )

  const handleLayerDuplicate = useCallback(
    (layerId: string) => {
      const layer = layers.find((l) => l.id === layerId)
      if (layer) {
        const newLayer = {
          ...layer,
          id: String(Date.now()),
          name: `${layer.name} (Copy)`,
          position: { ...layer.position, x: layer.position.x + 5, y: layer.position.y + 5 },
        }
        setLayers((prev) => [...prev, newLayer])
        setSelectedLayerId(newLayer.id)
      }
    },
    [layers],
  )

  const handleLayerAdd = useCallback(async (type: LayerType) => {
    const newLayer: Layer = {
      id: String(Date.now()),
      name: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      type,
      visible: true,
      locked: false,
      content: type === "text" ? "New Text" : `/placeholder.svg?height=100&width=100&query=${type}`,
      position: { x: 20, y: 20, width: type === "text" ? 60 : 40, height: type === "text" ? 10 : 30, rotation: 0 },
      style: {
        fontSize: type === "text" ? 24 : undefined,
        fontWeight: type === "text" ? "normal" : undefined,
        color: type === "text" ? "#FFFFFF" : undefined,
        textAlign: type === "text" ? "center" : undefined,
        opacity: 1,
      },
      timing: { startTime: 0, endTime: 15, duration: 15 },
    }
    setLayers((prev) => [...prev, newLayer])
    setSelectedLayerId(newLayer.id)

    try {
      await add(params.id, newLayer)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add layer.",
        variant: "destructive",
      })
    }
  }, [params.id, add, toast])

  const handleLayerReorder = useCallback(async (fromIndex: number, toIndex: number) => {
    setLayers((prev) => {
      const newLayers = [...prev]
      const [removed] = newLayers.splice(fromIndex, 1)
      newLayers.splice(toIndex, 0, removed)
      return newLayers
    })

    const newLayers = [...layers]
    const [removed] = newLayers.splice(fromIndex, 1)
    newLayers.splice(toIndex, 0, removed)

    try {
      await reorder(params.id, newLayers.map(l => l.id))
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reorder layers.",
        variant: "destructive",
      })
    }
  }, [layers, params.id, reorder, toast])

  const handleLayerOrderChange = useCallback((layerId: string, direction: "up" | "down") => {
    setLayers((prev) => {
      const index = prev.findIndex((l) => l.id === layerId)
      if (index === -1) return prev
      const newIndex = direction === "up" ? index - 1 : index + 1
      if (newIndex < 0 || newIndex >= prev.length) return prev
      const newLayers = [...prev]
      const [removed] = newLayers.splice(index, 1)
      newLayers.splice(newIndex, 0, removed)
      return newLayers
    })
  }, [])

  const handleShortcut = useCallback(
    (action: string) => {
      switch (action) {
        case "save":
          saveProject()
          break
        case "export":
          setExportOpen(true)
          break
        case "shortcuts":
          setShortcutsOpen(true)
          break
        case "play":
          setIsPlaying(true)
          break
        case "pause":
          setIsPlaying(false)
          break
        case "undo":
          console.log("[v0] Undo")
          break
        case "redo":
          console.log("[v0] Redo")
          break
        case "add-text":
          handleLayerAdd("text")
          break
        case "add-image":
          handleLayerAdd("image")
          break
        case "add-video":
          handleLayerAdd("video")
          break
        case "add-audio":
          handleLayerAdd("audio")
          break
        case "delete":
          if (selectedLayerId) {
            handleLayerDelete(selectedLayerId)
          }
          break
        case "duplicate":
          if (selectedLayerId) {
            handleLayerDuplicate(selectedLayerId)
          }
          break
        case "preview":
          console.log("[v0] Opening preview...")
          break
        default:
          break
      }
    },
    [selectedLayerId, handleLayerAdd, handleLayerDelete, handleLayerDuplicate],
  )

  const handleCommand = useCallback(
    (command: string) => {
      handleShortcut(command)
    },
    [handleShortcut],
  )

  useKeyboardShortcuts({ onShortcut: handleShortcut, isPlaying })

  const handleSceneAdd = () => {
    const newScene = {
      id: String(Date.now()),
      name: `Scene ${scenes.length + 1}`,
      thumbnail: "",
      duration: 3,
    }
    setScenes([...scenes, newScene])
    setActiveSceneId(newScene.id)
  }

  const handleSceneDuplicate = (sceneId: string) => {
    const scene = scenes.find((s) => s.id === sceneId)
    if (scene) {
      const newScene = {
        ...scene,
        id: String(Date.now()),
        name: `${scene.name} (Copy)`,
      }
      const index = scenes.findIndex((s) => s.id === sceneId)
      const newScenes = [...scenes]
      newScenes.splice(index + 1, 0, newScene)
      setScenes(newScenes)
    }
  }

  const handleSceneDelete = (sceneId: string) => {
    if (scenes.length <= 1) {
      console.error("[v0] Cannot delete the last scene")
      return
    }
    const newScenes = scenes.filter((s) => s.id !== sceneId)
    setScenes(newScenes)
    if (activeSceneId === sceneId) {
      setActiveSceneId(newScenes[0].id)
    }
  }

  const handleSceneReorder = (fromIndex: number, toIndex: number) => {
    const newScenes = [...scenes]
    const [removed] = newScenes.splice(fromIndex, 1)
    newScenes.splice(toIndex, 0, removed)
    setScenes(newScenes)
  }

  return (
    <TooltipProvider>
      <div className="flex h-screen flex-col bg-background">
        <header className="flex h-12 items-center justify-between border-b bg-card px-3 shrink-0">
          <div className="flex items-center gap-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                  <Link href="/dashboard">
                    <ArrowLeft className="h-4 w-4" />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Back to Dashboard</TooltipContent>
            </Tooltip>

            <div className="h-4 w-px bg-border" />

            <div>
              <h1 className="text-sm font-medium leading-none">{projectName || "Untitled Project"}</h1>
              <p className="text-[11px] text-muted-foreground mt-0.5">Draft - Edited 2 min ago</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <AIActionsPanel onActionComplete={(id) => console.log(`[v0] ${id} completed`)} />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 h-8 text-muted-foreground"
                  onClick={() => setShortcutsOpen(true)}
                >
                  <Command className="h-3.5 w-3.5" />
                  <span className="text-xs">K</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Command Palette</TooltipContent>
            </Tooltip>

            <div className="h-4 w-px bg-border mx-1" />

            <div className="flex items-center gap-0.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleShortcut("undo")}>
                    <Undo className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleShortcut("redo")}>
                    <Redo className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Redo (Ctrl+Y)</TooltipContent>
              </Tooltip>
            </div>

            <div className="h-4 w-px bg-border mx-1" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1.5 h-8" onClick={() => handleShortcut("preview")}>
                  <Eye className="h-4 w-4" />
                  <span className="text-xs hidden sm:inline">Preview</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Preview (P)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Share2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Share</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 h-8 bg-transparent"
                  onClick={() => handleShortcut("save")}
                >
                  <Save className="h-4 w-4" />
                  <span className="text-xs hidden sm:inline">Save</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Save (Ctrl+S)</TooltipContent>
            </Tooltip>

            <Button size="sm" className="gap-1.5 h-8" onClick={() => setExportOpen(true)}>
              <Download className="h-4 w-4" />
              <span className="text-xs hidden sm:inline">Export</span>
            </Button>
          </div>
        </header>

        {/* Editor Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar */}
          <div className="hidden w-72 lg:block">
            <EditorSidebar
              layers={layers}
              selectedLayerId={selectedLayerId}
              onLayerSelect={setSelectedLayerId}
              onLayerUpdate={handleLayerUpdate}
              onLayerDelete={handleLayerDelete}
              onLayerAdd={handleLayerAdd}
              onLayerReorder={handleLayerReorder}
            />
          </div>

          {/* Center - Canvas, Scene Navigator & Timeline */}
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 overflow-hidden">
              <EditorCanvas
                aspectRatio={aspectRatio}
                onAspectRatioChange={setAspectRatio}
                layers={layers}
                selectedLayerId={selectedLayerId}
                onLayerSelect={setSelectedLayerId}
                onLayerUpdate={handleLayerUpdate}
                onLayerDelete={handleLayerDelete}
                onLayerDuplicate={handleLayerDuplicate}
                isPlaying={isPlaying}
                onPlayingChange={setIsPlaying}
                currentTime={currentTime}
                onCurrentTimeChange={setCurrentTime}
              />
            </div>
            <SceneNavigator
              scenes={scenes}
              activeSceneId={activeSceneId}
              onSceneSelect={setActiveSceneId}
              onSceneAdd={handleSceneAdd}
              onSceneDuplicate={handleSceneDuplicate}
              onSceneDelete={handleSceneDelete}
              onSceneReorder={handleSceneReorder}
            />
            <Timeline
              layers={layers}
              selectedLayerId={selectedLayerId}
              onLayerSelect={setSelectedLayerId}
              onLayerUpdate={handleLayerUpdate}
              onLayerDelete={handleLayerDelete}
              onLayerDuplicate={handleLayerDuplicate}
              currentTime={currentTime}
              onCurrentTimeChange={setCurrentTime}
              totalDuration={15}
            />
          </div>

          {/* Right Sidebar */}
          <div className="hidden w-72 xl:block">
            <PropertiesPanel
              selectedLayer={selectedLayer}
              onLayerUpdate={handleLayerUpdate}
              onLayerDelete={handleLayerDelete}
              onLayerReorder={handleLayerOrderChange}
            />
          </div>
        </div>

        <ExportModal open={exportOpen} onOpenChange={setExportOpen} />
        <CommandPalette onCommand={handleCommand} />
        <ShortcutsModal open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
      </div>
    </TooltipProvider>
  )
}
