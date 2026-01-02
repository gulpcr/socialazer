"use client"

import type React from "react"

import {
  Type,
  ImageIcon,
  Video,
  Music,
  Layers,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Upload,
  GripVertical,
  Sparkles,
  Wand2,
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { VoiceOverPanel } from "./voice-over-panel"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import type { Layer, LayerType } from "@/lib/editor-types"
import { TextPresets, type TextPreset } from "./text-presets"
import { AnimationPresets } from "./animation-presets"
import { HistoryPanel } from "./history-panel"

interface EditorSidebarProps {
  layers: Layer[]
  selectedLayerId: string | null
  onLayerSelect: (layerId: string | null) => void
  onLayerUpdate: (layerId: string, updates: Partial<Layer>) => void
  onLayerDelete: (layerId: string) => void
  onLayerAdd: (type: LayerType) => void
  onLayerReorder: (fromIndex: number, toIndex: number) => void
}

export function EditorSidebar({
  layers,
  selectedLayerId,
  onLayerSelect,
  onLayerUpdate,
  onLayerDelete,
  onLayerAdd,
  onLayerReorder,
}: EditorSidebarProps) {
  const getLayerIcon = (type: LayerType) => {
    switch (type) {
      case "text":
        return <Type className="h-3.5 w-3.5" />
      case "image":
        return <ImageIcon className="h-3.5 w-3.5" />
      case "video":
        return <Video className="h-3.5 w-3.5" />
      case "audio":
        return <Music className="h-3.5 w-3.5" />
      default:
        return <Layers className="h-3.5 w-3.5" />
    }
  }

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData("layerIndex", String(index))
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault()
    const fromIndex = Number.parseInt(e.dataTransfer.getData("layerIndex"))
    if (fromIndex !== toIndex) {
      onLayerReorder(fromIndex, toIndex)
    }
  }

  const handleTextPresetSelect = (preset: TextPreset) => {
    const newLayer: Layer = {
      id: String(Date.now()),
      name: preset.name,
      type: "text",
      visible: true,
      locked: false,
      content: preset.preview,
      position: { x: 10, y: 30, width: 80, height: 15, rotation: 0 },
      style: {
        fontSize: preset.style.fontSize,
        fontWeight: preset.style.fontWeight,
        color: preset.style.color,
        backgroundColor: preset.style.backgroundColor,
        textAlign: (preset.style.textAlign as "left" | "center" | "right") || "center",
        opacity: 1,
      },
      timing: { startTime: 0, endTime: 15, duration: 15 },
    }
    // This would need to be handled by the parent
    onLayerAdd("text")
  }

  return (
    <div className="flex h-full flex-col border-r bg-card">
      <Tabs defaultValue="layers" className="flex h-full flex-col">
        <TabsList className="w-full justify-start rounded-none border-b bg-transparent px-2 shrink-0">
          <TabsTrigger value="layers" className="gap-1.5 data-[state=active]:bg-muted">
            <Layers className="h-3.5 w-3.5" />
            <span className="text-xs">Layers</span>
          </TabsTrigger>
          <TabsTrigger value="add" className="gap-1.5 data-[state=active]:bg-muted">
            <Plus className="h-3.5 w-3.5" />
            <span className="text-xs">Add</span>
          </TabsTrigger>
          <TabsTrigger value="styles" className="gap-1.5 data-[state=active]:bg-muted">
            <Wand2 className="h-3.5 w-3.5" />
            <span className="text-xs">Styles</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="layers" className="m-0 flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-1">
              {layers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Layers className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No layers yet</p>
                  <p className="text-xs">Add elements from the Add tab</p>
                </div>
              ) : (
                layers.map((layer, index) => (
                  <div
                    key={layer.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, index)}
                    onClick={() => onLayerSelect(layer.id)}
                    className={cn(
                      "flex items-center gap-2 rounded-lg p-2 cursor-pointer transition-colors group",
                      selectedLayerId === layer.id ? "bg-primary/10 border border-primary/20" : "hover:bg-muted",
                      !layer.visible && "opacity-50",
                    )}
                  >
                    <GripVertical className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 cursor-grab" />

                    <div className="h-8 w-8 rounded bg-muted flex items-center justify-center overflow-hidden shrink-0">
                      {layer.thumbnail ? (
                        <img
                          src={layer.thumbnail || "/placeholder.svg"}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        getLayerIcon(layer.type)
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{layer.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{layer.type}</p>
                    </div>

                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation()
                          onLayerUpdate(layer.id, { visible: !layer.visible })
                        }}
                      >
                        {layer.visible ? (
                          <Eye className="h-3 w-3" />
                        ) : (
                          <EyeOff className="h-3 w-3 text-muted-foreground" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation()
                          onLayerUpdate(layer.id, { locked: !layer.locked })
                        }}
                      >
                        {layer.locked ? (
                          <Lock className="h-3 w-3 text-muted-foreground" />
                        ) : (
                          <Unlock className="h-3 w-3" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation()
                          onLayerDelete(layer.id)
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-3 border-t">
              <HistoryPanel />
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="add" className="m-0 flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-6">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="h-20 flex-col gap-2 bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20 hover:border-blue-500/40"
                  onClick={() => onLayerAdd("text")}
                >
                  <Type className="h-6 w-6 text-blue-500" />
                  <span className="text-xs">Text</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex-col gap-2 bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20 hover:border-green-500/40"
                  onClick={() => onLayerAdd("image")}
                >
                  <ImageIcon className="h-6 w-6 text-green-500" />
                  <span className="text-xs">Image</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex-col gap-2 bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20 hover:border-purple-500/40"
                  onClick={() => onLayerAdd("video")}
                >
                  <Video className="h-6 w-6 text-purple-500" />
                  <span className="text-xs">Video</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex-col gap-2 bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20 hover:border-orange-500/40"
                  onClick={() => onLayerAdd("audio")}
                >
                  <Music className="h-6 w-6 text-orange-500" />
                  <span className="text-xs">Audio</span>
                </Button>
              </div>

              {/* Upload section */}
              <div className="space-y-3">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Upload</h3>
                <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer">
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm font-medium">Drop files here</p>
                  <p className="text-xs text-muted-foreground">or click to browse</p>
                </div>
              </div>

              {/* AI Generate section */}
              <div className="space-y-3">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">AI Generate</h3>
                <Button className="w-full gap-2" variant="default">
                  <Sparkles className="h-4 w-4" />
                  Generate with AI
                </Button>
              </div>

              {/* Stock media grid */}
              <div className="space-y-3">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Stock Media</h3>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div
                      key={i}
                      onClick={() => onLayerAdd("image")}
                      className="aspect-square cursor-pointer overflow-hidden rounded-lg border bg-muted transition-all hover:border-primary hover:scale-105"
                    >
                      <img
                        src={`/stock-photo-.jpg?height=80&width=80&query=stock photo ${i}`}
                        alt={`Stock ${i}`}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Voice-over panel */}
              <VoiceOverPanel />
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="styles" className="m-0 flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-6">
              <TextPresets onSelectPreset={handleTextPresetSelect} />
              <AnimationPresets
                onSelectAnimation={(id) => {
                  // Handle animation selection
                  console.log("Selected animation:", id)
                }}
              />

              {/* Brand Colors */}
              <div className="space-y-3">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Brand Colors</h4>
                <div className="flex flex-wrap gap-2">
                  {["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#FFFFFF", "#000000"].map(
                    (color) => (
                      <button
                        key={color}
                        className="h-8 w-8 rounded-lg border-2 border-transparent hover:border-primary transition-colors shadow-sm"
                        style={{ backgroundColor: color }}
                      />
                    ),
                  )}
                </div>
              </div>

              {/* Font Families */}
              <div className="space-y-3">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Fonts</h4>
                <div className="space-y-2">
                  {["Inter", "Poppins", "Roboto", "Montserrat", "Playfair Display"].map((font) => (
                    <button
                      key={font}
                      className="w-full text-left px-3 py-2 rounded-lg border hover:bg-muted transition-colors"
                      style={{ fontFamily: font }}
                    >
                      <span className="text-lg">{font}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  )
}
