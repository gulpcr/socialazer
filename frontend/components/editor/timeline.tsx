"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import {
  Type,
  ImageIcon,
  Video,
  Music,
  GripVertical,
  Plus,
  ChevronDown,
  ChevronUp,
  Copy,
  Trash2,
  Clock,
  Edit2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { Layer, LayerType } from "@/lib/editor-types"

interface TimelineProps {
  layers: Layer[]
  selectedLayerId: string | null
  onLayerSelect: (id: string | null) => void
  onLayerUpdate: (id: string, updates: Partial<Layer>) => void
  onLayerDelete: (id: string) => void
  onLayerDuplicate: (id: string) => void
  currentTime: number
  onCurrentTimeChange: (time: number) => void
  totalDuration?: number
}

const SECONDS_TO_PX = 60
const DEFAULT_DURATION = 15

export function Timeline({
  layers,
  selectedLayerId,
  onLayerSelect,
  onLayerUpdate,
  onLayerDelete,
  onLayerDuplicate,
  currentTime,
  onCurrentTimeChange,
  totalDuration = DEFAULT_DURATION,
}: TimelineProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [isDragging, setIsDragging] = useState<string | null>(null)
  const [isResizing, setIsResizing] = useState<{ id: string; edge: "left" | "right" } | null>(null)
  const [editingLayer, setEditingLayer] = useState<Layer | null>(null)
  const timelineRef = useRef<HTMLDivElement>(null)
  const dragStartRef = useRef<{ x: number; startTime: number; duration: number } | null>(null)

  const getIcon = (type: LayerType) => {
    switch (type) {
      case "text":
        return <Type className="h-3 w-3" />
      case "image":
        return <ImageIcon className="h-3 w-3" />
      case "video":
        return <Video className="h-3 w-3" />
      case "audio":
        return <Music className="h-3 w-3" />
    }
  }

  const getTrackColor = (type: LayerType) => {
    switch (type) {
      case "video":
        return "bg-purple-500"
      case "image":
        return "bg-emerald-500"
      case "text":
        return "bg-blue-500"
      case "audio":
        return "bg-orange-500"
    }
  }

  const tracks: { type: LayerType; label: string; items: Layer[] }[] = [
    { type: "video", label: "Video", items: layers.filter((l) => l.type === "video") },
    { type: "image", label: "Images", items: layers.filter((l) => l.type === "image") },
    { type: "text", label: "Text", items: layers.filter((l) => l.type === "text") },
    { type: "audio", label: "Audio", items: layers.filter((l) => l.type === "audio") },
  ]

  const handleClipMouseDown = (e: React.MouseEvent, layer: Layer, action: "drag" | "resize-left" | "resize-right") => {
    e.stopPropagation()
    e.preventDefault()
    onLayerSelect(layer.id)

    dragStartRef.current = {
      x: e.clientX,
      startTime: layer.timing.startTime,
      duration: layer.timing.duration,
    }

    if (action === "drag") {
      setIsDragging(layer.id)
    } else {
      setIsResizing({ id: layer.id, edge: action === "resize-left" ? "left" : "right" })
    }
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStartRef.current) return

      const deltaX = e.clientX - dragStartRef.current.x
      const deltaTime = deltaX / SECONDS_TO_PX

      if (isDragging) {
        const layer = layers.find((l) => l.id === isDragging)
        if (layer) {
          const newStartTime = Math.max(
            0,
            Math.min(totalDuration - layer.timing.duration, dragStartRef.current.startTime + deltaTime),
          )
          onLayerUpdate(isDragging, {
            timing: {
              ...layer.timing,
              startTime: newStartTime,
              endTime: newStartTime + layer.timing.duration,
            },
          })
        }
      } else if (isResizing) {
        const layer = layers.find((l) => l.id === isResizing.id)
        if (layer) {
          if (isResizing.edge === "left") {
            const newStartTime = Math.max(
              0,
              Math.min(layer.timing.endTime - 0.5, dragStartRef.current.startTime + deltaTime),
            )
            const newDuration = layer.timing.endTime - newStartTime
            onLayerUpdate(isResizing.id, {
              timing: {
                ...layer.timing,
                startTime: newStartTime,
                duration: newDuration,
              },
            })
          } else {
            const newDuration = Math.max(
              0.5,
              Math.min(totalDuration - layer.timing.startTime, dragStartRef.current.duration + deltaTime),
            )
            onLayerUpdate(isResizing.id, {
              timing: {
                ...layer.timing,
                duration: newDuration,
                endTime: layer.timing.startTime + newDuration,
              },
            })
          }
        }
      }
    }

    const handleMouseUp = () => {
      setIsDragging(null)
      setIsResizing(null)
      dragStartRef.current = null
    }

    if (isDragging || isResizing) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
      return () => {
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("mouseup", handleMouseUp)
      }
    }
  }, [isDragging, isResizing, layers, totalDuration, onLayerUpdate])

  const handleTimelineClick = (e: React.MouseEvent) => {
    if (!timelineRef.current || isDragging || isResizing) return
    const rect = timelineRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const newTime = Math.max(0, Math.min(totalDuration, x / SECONDS_TO_PX))
    onCurrentTimeChange(newTime)
  }

  const handleDoubleClick = (e: React.MouseEvent, layer: Layer) => {
    e.stopPropagation()
    setEditingLayer({ ...layer })
  }

  const handleSaveEdit = () => {
    if (editingLayer) {
      onLayerUpdate(editingLayer.id, editingLayer)
      setEditingLayer(null)
    }
  }

  const selectedLayer = layers.find((l) => l.id === selectedLayerId)

  return (
    <TooltipProvider>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div className="border-t bg-card">
          {/* Timeline header */}
          <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
            <div className="flex items-center gap-2">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <span className="text-sm font-medium">Timeline</span>
              {selectedLayer && (
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">{selectedLayer.name}</span>
              )}
            </div>

            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    disabled={!selectedLayer}
                    onClick={() => selectedLayer && setEditingLayer({ ...selectedLayer })}
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Edit (Double-click)</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    disabled={!selectedLayerId}
                    onClick={() => selectedLayerId && onLayerDuplicate(selectedLayerId)}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Duplicate (Ctrl+D)</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    disabled={!selectedLayerId}
                    onClick={() => selectedLayerId && onLayerDelete(selectedLayerId)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Delete (Del)</TooltipContent>
              </Tooltip>
            </div>
          </div>

          <CollapsibleContent>
            {/* Time ruler */}
            <div className="flex border-b">
              <div className="w-28 shrink-0 border-r bg-muted/20 flex items-center justify-center">
                <span className="text-[10px] text-muted-foreground">
                  {currentTime.toFixed(1)}s / {totalDuration}s
                </span>
              </div>
              <ScrollArea className="flex-1">
                <div
                  ref={timelineRef}
                  className="relative h-6 cursor-pointer"
                  style={{ width: totalDuration * SECONDS_TO_PX }}
                  onClick={handleTimelineClick}
                >
                  {Array.from({ length: totalDuration + 1 }).map((_, i) => (
                    <div
                      key={i}
                      className="absolute top-0 h-full border-l border-border/30"
                      style={{ left: i * SECONDS_TO_PX }}
                    >
                      <span className="ml-1 text-[10px] text-muted-foreground">{i}s</span>
                    </div>
                  ))}
                  <div
                    className="absolute top-0 h-full w-0.5 bg-primary z-20"
                    style={{ left: currentTime * SECONDS_TO_PX }}
                  >
                    <div className="absolute -top-0.5 -left-2 w-4 h-3 bg-primary rounded-b-sm" />
                  </div>
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </div>

            {/* Tracks */}
            <ScrollArea className="h-44">
              {tracks.map((track) => (
                <div key={track.type} className="flex border-b last:border-b-0 group">
                  <div className="w-28 shrink-0 border-r bg-muted/20 px-2 py-2 flex items-center gap-2">
                    <div
                      className={cn(
                        "h-6 w-6 rounded flex items-center justify-center",
                        track.type === "video" && "bg-purple-500/20 text-purple-500",
                        track.type === "image" && "bg-emerald-500/20 text-emerald-500",
                        track.type === "text" && "bg-blue-500/20 text-blue-500",
                        track.type === "audio" && "bg-orange-500/20 text-orange-500",
                      )}
                    >
                      {getIcon(track.type)}
                    </div>
                    <span className="text-xs font-medium truncate">{track.label}</span>
                  </div>

                  <div
                    className="relative flex-1 h-10 py-1 overflow-x-auto"
                    style={{ minWidth: totalDuration * SECONDS_TO_PX }}
                  >
                    {/* Playhead line through tracks */}
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-primary/30 z-10 pointer-events-none"
                      style={{ left: currentTime * SECONDS_TO_PX }}
                    />

                    {track.items.map((layer) => (
                      <div
                        key={layer.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          onLayerSelect(layer.id)
                        }}
                        onDoubleClick={(e) => handleDoubleClick(e, layer)}
                        className={cn(
                          "absolute top-1 bottom-1 rounded-md cursor-pointer flex items-center text-white text-xs font-medium transition-all group/clip",
                          getTrackColor(layer.type),
                          !layer.visible && "opacity-50",
                          selectedLayerId === layer.id
                            ? "ring-2 ring-primary ring-offset-1 ring-offset-background shadow-lg"
                            : "hover:brightness-110",
                        )}
                        style={{
                          left: layer.timing.startTime * SECONDS_TO_PX,
                          width: Math.max(layer.timing.duration * SECONDS_TO_PX, 40),
                        }}
                      >
                        {/* Left resize handle */}
                        <div
                          className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/30 rounded-l-md flex items-center justify-center z-10"
                          onMouseDown={(e) => handleClipMouseDown(e, layer, "resize-left")}
                        >
                          <div className="w-0.5 h-4 bg-white/50 rounded-full opacity-0 group-hover/clip:opacity-100" />
                        </div>

                        {/* Clip content */}
                        <div
                          className="flex-1 flex items-center gap-1 px-3 overflow-hidden cursor-move"
                          onMouseDown={(e) => handleClipMouseDown(e, layer, "drag")}
                        >
                          <GripVertical className="h-3 w-3 opacity-50 shrink-0" />
                          <span className="truncate">{layer.name}</span>
                        </div>

                        {/* Right resize handle */}
                        <div
                          className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/30 rounded-r-md flex items-center justify-center z-10"
                          onMouseDown={(e) => handleClipMouseDown(e, layer, "resize-right")}
                        >
                          <div className="w-0.5 h-4 bg-white/50 rounded-full opacity-0 group-hover/clip:opacity-100" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </ScrollArea>

            {/* Add track button */}
            <div className="flex items-center justify-center border-t py-2 bg-muted/20">
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground h-7">
                <Plus className="h-3 w-3" />
                Add Element
              </Button>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      <Dialog open={!!editingLayer} onOpenChange={(open) => !open && setEditingLayer(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingLayer && getIcon(editingLayer.type)}
              Edit {editingLayer?.type}
            </DialogTitle>
          </DialogHeader>

          {editingLayer && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={editingLayer.name}
                  onChange={(e) => setEditingLayer({ ...editingLayer, name: e.target.value })}
                />
              </div>

              {editingLayer.type === "text" && (
                <div className="space-y-2">
                  <Label>Content</Label>
                  <Input
                    value={editingLayer.content}
                    onChange={(e) => setEditingLayer({ ...editingLayer, content: e.target.value })}
                  />
                </div>
              )}

              <div className="space-y-3 pt-2 border-t">
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm font-medium">Timing</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Start (seconds)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={totalDuration - 0.5}
                      step={0.1}
                      value={editingLayer.timing.startTime}
                      onChange={(e) => {
                        const startTime = Number.parseFloat(e.target.value) || 0
                        setEditingLayer({
                          ...editingLayer,
                          timing: {
                            ...editingLayer.timing,
                            startTime,
                            endTime: startTime + editingLayer.timing.duration,
                          },
                        })
                      }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Duration (seconds)</Label>
                    <Input
                      type="number"
                      min={0.5}
                      max={totalDuration}
                      step={0.1}
                      value={editingLayer.timing.duration}
                      onChange={(e) => {
                        const duration = Number.parseFloat(e.target.value) || 0.5
                        setEditingLayer({
                          ...editingLayer,
                          timing: {
                            ...editingLayer.timing,
                            duration,
                            endTime: editingLayer.timing.startTime + duration,
                          },
                        })
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Opacity</span>
                    <span>{Math.round((editingLayer.style.opacity || 1) * 100)}%</span>
                  </div>
                  <Slider
                    value={[(editingLayer.style.opacity || 1) * 100]}
                    onValueChange={([value]) =>
                      setEditingLayer({
                        ...editingLayer,
                        style: { ...editingLayer.style, opacity: value / 100 },
                      })
                    }
                    min={0}
                    max={100}
                    step={1}
                  />
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onLayerDuplicate(editingLayer.id)
                      setEditingLayer(null)
                    }}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Duplicate
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive bg-transparent"
                    onClick={() => {
                      onLayerDelete(editingLayer.id)
                      setEditingLayer(null)
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
                <Button size="sm" onClick={handleSaveEdit}>
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}
