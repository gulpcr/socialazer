"use client"

import type React from "react"
import { useRef, useState, useEffect } from "react"
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  Maximize,
  ZoomIn,
  ZoomOut,
  Grid3X3,
  Smartphone,
  Monitor,
  Square,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { Layer } from "@/lib/editor-types"
import { FloatingToolbar } from "./floating-toolbar"

interface EditorCanvasProps {
  aspectRatio: "9:16" | "1:1" | "16:9"
  onAspectRatioChange: (ratio: "9:16" | "1:1" | "16:9") => void
  layers: Layer[]
  selectedLayerId: string | null
  onLayerSelect: (layerId: string | null) => void
  onLayerUpdate: (layerId: string, updates: Partial<Layer>) => void
  onLayerDelete?: (layerId: string) => void
  onLayerDuplicate?: (layerId: string) => void
  isPlaying: boolean
  onPlayingChange: (isPlaying: boolean) => void
  currentTime: number
  onCurrentTimeChange: (time: number) => void
}

const aspectRatioConfig = {
  "9:16": { class: "aspect-[9/16]", icon: Smartphone, label: "Story / Reels", maxWidth: "max-w-[280px]" },
  "1:1": { class: "aspect-square", icon: Square, label: "Square", maxWidth: "max-w-[380px]" },
  "16:9": { class: "aspect-video", icon: Monitor, label: "Landscape", maxWidth: "max-w-[520px]" },
}

export function EditorCanvas({
  aspectRatio,
  onAspectRatioChange,
  layers,
  selectedLayerId,
  onLayerSelect,
  onLayerUpdate,
  onLayerDelete,
  onLayerDuplicate,
  isPlaying,
  onPlayingChange,
  currentTime,
  onCurrentTimeChange,
}: EditorCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const [volume, setVolume] = useState([80])
  const [duration] = useState(15)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState<string | null>(null)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [elementStart, setElementStart] = useState({ x: 0, y: 0, width: 0, height: 0 })
  const [zoom, setZoom] = useState(100)
  const [showGrid, setShowGrid] = useState(false)
  const [snapGuides, setSnapGuides] = useState<{ x: number | null; y: number | null }>({ x: null, y: null })
  const [floatingToolbarPos, setFloatingToolbarPos] = useState({ x: 0, y: 0 })

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const selectedLayer = layers.find((l) => l.id === selectedLayerId)

  // Update floating toolbar position when selection changes
  useEffect(() => {
    if (selectedLayer && canvasRef.current) {
      const canvasRect = canvasRef.current.getBoundingClientRect()
      const x =
        canvasRect.left + ((selectedLayer.position.x + selectedLayer.position.width / 2) * canvasRect.width) / 100
      const y = canvasRect.top + (selectedLayer.position.y * canvasRect.height) / 100
      setFloatingToolbarPos({ x, y })
    }
  }, [selectedLayer])

  // Handle dragging elements
  const handleMouseDown = (e: React.MouseEvent, layer: Layer, action: "move" | "resize" = "move") => {
    if (layer.locked) return
    e.stopPropagation()
    onLayerSelect(layer.id)

    if (action === "resize") {
      setIsResizing(layer.id)
    } else {
      setIsDragging(true)
    }

    setDragStart({ x: e.clientX, y: e.clientY })
    setElementStart({
      x: layer.position.x,
      y: layer.position.y,
      width: layer.position.width,
      height: layer.position.height,
    })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!selectedLayerId) return
    const layer = layers.find((l) => l.id === selectedLayerId)
    if (!layer || layer.locked) return

    const canvas = canvasRef.current
    if (!canvas) return

    const canvasRect = canvas.getBoundingClientRect()
    const deltaX = ((e.clientX - dragStart.x) / canvasRect.width) * 100
    const deltaY = ((e.clientY - dragStart.y) / canvasRect.height) * 100

    if (isDragging) {
      let newX = Math.max(0, Math.min(100 - layer.position.width, elementStart.x + deltaX))
      let newY = Math.max(0, Math.min(100 - layer.position.height, elementStart.y + deltaY))

      // Snap to center guides
      const centerX = 50 - layer.position.width / 2
      const centerY = 50 - layer.position.height / 2
      const snapThreshold = 2

      if (Math.abs(newX - centerX) < snapThreshold) {
        newX = centerX
        setSnapGuides((prev) => ({ ...prev, x: 50 }))
      } else {
        setSnapGuides((prev) => ({ ...prev, x: null }))
      }

      if (Math.abs(newY - centerY) < snapThreshold) {
        newY = centerY
        setSnapGuides((prev) => ({ ...prev, y: 50 }))
      } else {
        setSnapGuides((prev) => ({ ...prev, y: null }))
      }

      onLayerUpdate(layer.id, {
        position: { ...layer.position, x: newX, y: newY },
      })
    } else if (isResizing) {
      const newWidth = Math.max(10, Math.min(100, elementStart.width + deltaX))
      const newHeight = Math.max(5, Math.min(100, elementStart.height + deltaY))

      onLayerUpdate(layer.id, {
        position: { ...layer.position, width: newWidth, height: newHeight },
      })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    setIsResizing(null)
    setSnapGuides({ x: null, y: null })
  }

  // Render layer based on type
  const renderLayer = (layer: Layer, index: number) => {
    if (!layer.visible) return null

    const isSelected = selectedLayerId === layer.id
    const style: React.CSSProperties = {
      position: "absolute",
      left: `${layer.position.x}%`,
      top: `${layer.position.y}%`,
      width: `${layer.position.width}%`,
      height: layer.type === "text" ? "auto" : `${layer.position.height}%`,
      transform: `rotate(${layer.position.rotation}deg)`,
      opacity: layer.style.opacity ?? 1,
      cursor: layer.locked ? "default" : "move",
      zIndex: index + 1,
    }

    const commonClasses = cn(
      "transition-shadow",
      isSelected && "ring-2 ring-primary shadow-lg shadow-primary/20",
      !layer.locked && !isSelected && "hover:ring-1 hover:ring-primary/50",
    )

    const resizeHandle = isSelected && !layer.locked && (
      <div
        className="absolute -bottom-1.5 -right-1.5 h-3 w-3 cursor-se-resize rounded-full border-2 border-primary bg-background shadow-sm"
        onMouseDown={(e) => handleMouseDown(e, layer, "resize")}
      />
    )

    switch (layer.type) {
      case "text":
        return (
          <div
            key={layer.id}
            style={{
              ...style,
              fontSize: `${(layer.style.fontSize || 24) * (zoom / 100)}px`,
              fontWeight: layer.style.fontWeight,
              color: layer.style.color,
              textAlign: layer.style.textAlign as React.CSSProperties["textAlign"],
              backgroundColor: layer.style.backgroundColor,
              padding: layer.style.backgroundColor ? "8px 16px" : undefined,
              borderRadius: layer.style.backgroundColor ? "6px" : undefined,
            }}
            className={cn(commonClasses, "select-none")}
            onMouseDown={(e) => handleMouseDown(e, layer)}
          >
            <span className="drop-shadow-lg whitespace-pre-wrap">{layer.content}</span>
            {resizeHandle}
          </div>
        )

      case "image":
        return (
          <div
            key={layer.id}
            style={{ ...style, height: `${layer.position.height}%` }}
            className={cn(commonClasses, "overflow-hidden rounded-lg")}
            onMouseDown={(e) => handleMouseDown(e, layer)}
          >
            <img
              src={layer.content || "/placeholder.svg?height=100&width=100&query=image"}
              alt={layer.name}
              className="h-full w-full object-cover"
              draggable={false}
            />
            {resizeHandle}
          </div>
        )

      case "video":
        return (
          <div
            key={layer.id}
            style={{ ...style, height: `${layer.position.height}%` }}
            className={cn(commonClasses, "overflow-hidden rounded-lg bg-black/80")}
            onMouseDown={(e) => handleMouseDown(e, layer)}
          >
            <div className="h-full w-full flex items-center justify-center text-white/50">
              <div className="text-center">
                <Play className="h-8 w-8 mx-auto mb-1" />
                <span className="text-xs">Video</span>
              </div>
            </div>
            {resizeHandle}
          </div>
        )

      case "audio":
        return null

      default:
        return null
    }
  }

  const visibleLayers = layers.filter((l) => l.type !== "audio")
  const config = aspectRatioConfig[aspectRatio]

  return (
    <TooltipProvider>
      <div className="flex h-full flex-col bg-[#1a1a1a]">
        <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-[#1a1a1a]">
          {/* Left: Zoom controls */}
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
                  onClick={() => setZoom(Math.max(50, zoom - 10))}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom Out</TooltipContent>
            </Tooltip>
            <span className="text-xs text-white/50 w-12 text-center">{zoom}%</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
                  onClick={() => setZoom(Math.min(150, zoom + 10))}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom In</TooltipContent>
            </Tooltip>
            <div className="w-px h-4 bg-white/10 mx-2" />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-8 w-8 text-white/70 hover:text-white hover:bg-white/10",
                    showGrid && "bg-white/10 text-white",
                  )}
                  onClick={() => setShowGrid(!showGrid)}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Toggle Grid</TooltipContent>
            </Tooltip>
          </div>

          {/* Center: Aspect ratio pills */}
          <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
            {(Object.entries(aspectRatioConfig) as [typeof aspectRatio, typeof config][]).map(([ratio, cfg]) => {
              const Icon = cfg.icon
              return (
                <Tooltip key={ratio}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => onAspectRatioChange(ratio)}
                      className={cn(
                        "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                        aspectRatio === ratio
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-white/60 hover:text-white hover:bg-white/10",
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span>{ratio}</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>{cfg.label}</TooltipContent>
                </Tooltip>
              )
            })}
          </div>

          {/* Right: Preview button */}
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
                >
                  <Maximize className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Fullscreen Preview</TooltipContent>
            </Tooltip>
          </div>
        </div>

        <div
          className="flex-1 flex items-center justify-center p-8 overflow-auto"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0)",
            backgroundSize: "24px 24px",
          }}
          onClick={() => onLayerSelect(null)}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div
            ref={canvasRef}
            className={cn(
              "relative w-full overflow-hidden rounded-xl shadow-2xl ring-1 ring-white/10",
              config.class,
              config.maxWidth,
            )}
            style={{
              transform: `scale(${zoom / 100})`,
              transformOrigin: "center center",
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            }}
          >
            {/* Grid overlay */}
            {showGrid && (
              <div
                className="absolute inset-0 pointer-events-none z-50"
                style={{
                  backgroundImage: `
                    linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
                  `,
                  backgroundSize: "10% 10%",
                }}
              />
            )}

            {/* Snap guides */}
            {snapGuides.x !== null && (
              <div
                className="absolute top-0 bottom-0 w-px bg-primary z-50 pointer-events-none"
                style={{ left: `${snapGuides.x}%` }}
              />
            )}
            {snapGuides.y !== null && (
              <div
                className="absolute left-0 right-0 h-px bg-primary z-50 pointer-events-none"
                style={{ top: `${snapGuides.y}%` }}
              />
            )}

            {/* Render layers */}
            {visibleLayers.map((layer, index) => renderLayer(layer, index))}

            {/* Empty state */}
            {visibleLayers.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-white/40">
                <div className="text-center">
                  <p className="text-sm font-medium">Drop elements here</p>
                  <p className="text-xs mt-1">or add from the sidebar</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-white/10 bg-[#1a1a1a] p-4 space-y-3">
          <div className="space-y-1">
            <Slider
              value={[currentTime]}
              onValueChange={([val]) => onCurrentTimeChange(val)}
              max={duration}
              step={0.1}
              className="cursor-pointer"
            />
            <div className="flex justify-between text-xs text-white/40">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10">
                <SkipBack className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 text-white hover:bg-white/10"
                onClick={() => onPlayingChange(!isPlaying)}
              >
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10">
                <SkipForward className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Volume2 className="h-4 w-4 text-white/40" />
              <Slider value={volume} onValueChange={setVolume} max={100} className="w-20" />
            </div>
          </div>
        </div>

        {/* Floating toolbar */}
        {selectedLayer && (
          <FloatingToolbar
            elementType={selectedLayer.type}
            position={floatingToolbarPos}
            visible={!!selectedLayerId && !isDragging && !isResizing}
            onDuplicate={() => onLayerDuplicate?.(selectedLayerId!)}
            onDelete={() => onLayerDelete?.(selectedLayerId!)}
            onBringForward={() => {}}
            onSendBackward={() => {}}
            onAIEnhance={() => {}}
          />
        )}
      </div>
    </TooltipProvider>
  )
}
