"use client"

import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  ChevronUp,
  ChevronDown,
  Trash2,
  Type,
  ImageIcon,
  Video,
  Music,
  Move,
  RotateCw,
  Maximize2,
} from "lucide-react"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { Layer } from "@/lib/editor-types"

interface PropertiesPanelProps {
  selectedLayer: Layer | null
  onLayerUpdate: (layerId: string, updates: Partial<Layer>) => void
  onLayerDelete: (layerId: string) => void
  onLayerReorder: (layerId: string, direction: "up" | "down") => void
}

export function PropertiesPanel({ selectedLayer, onLayerUpdate, onLayerDelete, onLayerReorder }: PropertiesPanelProps) {
  if (!selectedLayer) {
    return (
      <div className="h-full border-l bg-card p-4 flex items-center justify-center">
        <p className="text-sm text-muted-foreground text-center">Select an element to view its properties</p>
      </div>
    )
  }

  const updateStyle = (key: string, value: unknown) => {
    onLayerUpdate(selectedLayer.id, {
      style: { ...selectedLayer.style, [key]: value },
    })
  }

  const updatePosition = (key: string, value: number) => {
    onLayerUpdate(selectedLayer.id, {
      position: { ...selectedLayer.position, [key]: value },
    })
  }

  const updateTiming = (key: string, value: number) => {
    onLayerUpdate(selectedLayer.id, {
      timing: { ...selectedLayer.timing, [key]: value },
    })
  }

  return (
    <div className="flex h-full flex-col border-l bg-card">
      <div className="border-b p-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          {selectedLayer.type === "text" && <Type className="h-4 w-4" />}
          {selectedLayer.type === "image" && <ImageIcon className="h-4 w-4" />}
          {selectedLayer.type === "video" && <Video className="h-4 w-4" />}
          {selectedLayer.type === "audio" && <Music className="h-4 w-4" />}
          {selectedLayer.name}
        </h3>
      </div>

      <ScrollArea className="flex-1">
        <Tabs defaultValue="style" className="w-full">
          <TabsList className="w-full justify-start rounded-none border-b bg-transparent px-2">
            <TabsTrigger value="style" className="text-xs">
              Style
            </TabsTrigger>
            <TabsTrigger value="position" className="text-xs">
              Position
            </TabsTrigger>
            <TabsTrigger value="timing" className="text-xs">
              Timing
            </TabsTrigger>
          </TabsList>

          {/* Style Tab */}
          <TabsContent value="style" className="m-0 p-4 space-y-4">
            {/* Text-specific properties */}
            {selectedLayer.type === "text" && (
              <>
                <div className="space-y-2">
                  <Label>Content</Label>
                  <Input
                    value={selectedLayer.content}
                    onChange={(e) => onLayerUpdate(selectedLayer.id, { content: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Font Family</Label>
                  <Select
                    value={selectedLayer.style.fontFamily || "inter"}
                    onValueChange={(v) => updateStyle("fontFamily", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inter">Inter</SelectItem>
                      <SelectItem value="poppins">Poppins</SelectItem>
                      <SelectItem value="roboto">Roboto</SelectItem>
                      <SelectItem value="montserrat">Montserrat</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Font Size: {selectedLayer.style.fontSize || 24}px</Label>
                  <Slider
                    value={[selectedLayer.style.fontSize || 24]}
                    onValueChange={([v]) => updateStyle("fontSize", v)}
                    min={12}
                    max={72}
                    step={1}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={selectedLayer.style.color || "#FFFFFF"}
                      onChange={(e) => updateStyle("color", e.target.value)}
                      className="h-10 w-14 p-1"
                    />
                    <Input
                      value={selectedLayer.style.color || "#FFFFFF"}
                      onChange={(e) => updateStyle("color", e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Alignment</Label>
                  <ToggleGroup
                    type="single"
                    value={selectedLayer.style.textAlign || "left"}
                    onValueChange={(v) => v && updateStyle("textAlign", v)}
                    className="justify-start"
                  >
                    <ToggleGroupItem value="left" aria-label="Align left">
                      <AlignLeft className="h-4 w-4" />
                    </ToggleGroupItem>
                    <ToggleGroupItem value="center" aria-label="Align center">
                      <AlignCenter className="h-4 w-4" />
                    </ToggleGroupItem>
                    <ToggleGroupItem value="right" aria-label="Align right">
                      <AlignRight className="h-4 w-4" />
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>
              </>
            )}

            {/* Image-specific properties */}
            {selectedLayer.type === "image" && (
              <>
                <div className="space-y-2">
                  <Label>Source</Label>
                  <Input value={selectedLayer.content} disabled className="text-xs" />
                  <Button variant="outline" size="sm" className="w-full bg-transparent">
                    Replace Image
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label>Border Radius: {selectedLayer.style.borderRadius || 0}px</Label>
                  <Slider
                    value={[selectedLayer.style.borderRadius || 0]}
                    onValueChange={([v]) => updateStyle("borderRadius", v)}
                    min={0}
                    max={50}
                    step={1}
                  />
                </div>
              </>
            )}

            {/* Video-specific properties */}
            {selectedLayer.type === "video" && (
              <>
                <div className="space-y-2">
                  <Label>Source</Label>
                  <Input value={selectedLayer.content} disabled className="text-xs" />
                  <Button variant="outline" size="sm" className="w-full bg-transparent">
                    Replace Video
                  </Button>
                </div>
              </>
            )}

            {/* Audio-specific properties */}
            {selectedLayer.type === "audio" && (
              <>
                <div className="space-y-2">
                  <Label>Source</Label>
                  <Input value={selectedLayer.content} disabled className="text-xs" />
                  <Button variant="outline" size="sm" className="w-full bg-transparent">
                    Replace Audio
                  </Button>
                </div>
              </>
            )}

            {/* Common: Opacity */}
            <div className="space-y-2">
              <Label>Opacity: {Math.round((selectedLayer.style.opacity ?? 1) * 100)}%</Label>
              <Slider
                value={[Math.round((selectedLayer.style.opacity ?? 1) * 100)]}
                onValueChange={([v]) => updateStyle("opacity", v / 100)}
                min={0}
                max={100}
                step={1}
              />
            </div>
          </TabsContent>

          {/* Position Tab */}
          <TabsContent value="position" className="m-0 p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Move className="h-3 w-3" /> X (%)
                </Label>
                <Input
                  type="number"
                  value={Math.round(selectedLayer.position.x)}
                  onChange={(e) => updatePosition("x", Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Move className="h-3 w-3" /> Y (%)
                </Label>
                <Input
                  type="number"
                  value={Math.round(selectedLayer.position.y)}
                  onChange={(e) => updatePosition("y", Number(e.target.value))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Maximize2 className="h-3 w-3" /> Width (%)
                </Label>
                <Input
                  type="number"
                  value={Math.round(selectedLayer.position.width)}
                  onChange={(e) => updatePosition("width", Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Maximize2 className="h-3 w-3" /> Height (%)
                </Label>
                <Input
                  type="number"
                  value={Math.round(selectedLayer.position.height)}
                  onChange={(e) => updatePosition("height", Number(e.target.value))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <RotateCw className="h-3 w-3" /> Rotation: {selectedLayer.position.rotation}°
              </Label>
              <Slider
                value={[selectedLayer.position.rotation]}
                onValueChange={([v]) => updatePosition("rotation", v)}
                min={0}
                max={360}
                step={1}
              />
            </div>
            <div className="space-y-2">
              <Label>Layer Order</Label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1 bg-transparent"
                  onClick={() => onLayerReorder(selectedLayer.id, "up")}
                >
                  <ChevronUp className="h-3 w-3" />
                  Forward
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1 bg-transparent"
                  onClick={() => onLayerReorder(selectedLayer.id, "down")}
                >
                  <ChevronDown className="h-3 w-3" />
                  Back
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Timing Tab */}
          <TabsContent value="timing" className="m-0 p-4 space-y-4">
            <div className="space-y-2">
              <Label>Start Time: {selectedLayer.timing.startTime}s</Label>
              <Slider
                value={[selectedLayer.timing.startTime]}
                onValueChange={([v]) => updateTiming("startTime", v)}
                min={0}
                max={15}
                step={0.1}
              />
            </div>
            <div className="space-y-2">
              <Label>Duration: {selectedLayer.timing.duration}s</Label>
              <Slider
                value={[selectedLayer.timing.duration]}
                onValueChange={([v]) => {
                  updateTiming("duration", v)
                  updateTiming("endTime", selectedLayer.timing.startTime + v)
                }}
                min={0.5}
                max={15}
                step={0.1}
              />
            </div>
            <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
              <p>
                This element will appear at <strong>{selectedLayer.timing.startTime}s</strong> and last for{" "}
                <strong>{selectedLayer.timing.duration}s</strong>
              </p>
              <p className="mt-1">
                End time: <strong>{selectedLayer.timing.endTime.toFixed(1)}s</strong>
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </ScrollArea>

      {/* Delete button */}
      <div className="border-t p-3">
        <Button
          variant="destructive"
          size="sm"
          className="w-full gap-2"
          onClick={() => onLayerDelete(selectedLayer.id)}
        >
          <Trash2 className="h-3 w-3" />
          Delete Element
        </Button>
      </div>
    </div>
  )
}
