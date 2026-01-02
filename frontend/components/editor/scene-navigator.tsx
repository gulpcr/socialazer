"use client"

import type React from "react"

import { useState } from "react"
import { Plus, GripVertical, Copy, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu"

interface Scene {
  id: string
  name: string
  thumbnail: string
  duration: number
}

interface SceneNavigatorProps {
  scenes: Scene[]
  activeSceneId: string
  onSceneSelect: (sceneId: string) => void
  onSceneAdd: () => void
  onSceneDuplicate: (sceneId: string) => void
  onSceneDelete: (sceneId: string) => void
  onSceneReorder: (fromIndex: number, toIndex: number) => void
}

export function SceneNavigator({
  scenes,
  activeSceneId,
  onSceneSelect,
  onSceneAdd,
  onSceneDuplicate,
  onSceneDelete,
  onSceneReorder,
}: SceneNavigatorProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex !== null && draggedIndex !== index) {
      onSceneReorder(draggedIndex, index)
      setDraggedIndex(index)
    }
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  return (
    <div className="flex items-center gap-2 border-t bg-muted/30 px-4 py-3 overflow-x-auto">
      <span className="text-xs font-medium text-muted-foreground shrink-0">Scenes</span>
      <div className="flex items-center gap-2">
        {scenes.map((scene, index) => (
          <ContextMenu key={scene.id}>
            <ContextMenuTrigger asChild>
              <div
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                onClick={() => onSceneSelect(scene.id)}
                className={cn(
                  "group relative flex flex-col items-center gap-1 cursor-pointer transition-all",
                  draggedIndex === index && "opacity-50",
                )}
              >
                <div
                  className={cn(
                    "relative h-14 w-24 rounded-md overflow-hidden border-2 transition-colors bg-muted",
                    activeSceneId === scene.id
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-transparent hover:border-border",
                  )}
                >
                  <img
                    src={
                      scene.thumbnail || `/placeholder.svg?height=56&width=96&query=${encodeURIComponent(scene.name)}`
                    }
                    alt={scene.name}
                    className="h-full w-full object-cover"
                  />
                  {/* Duration badge */}
                  <div className="absolute bottom-1 right-1 rounded bg-black/70 px-1 py-0.5 text-[10px] text-white">
                    {scene.duration}s
                  </div>
                  {/* Drag handle */}
                  <div className="absolute left-1 top-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <GripVertical className="h-3 w-3 text-white drop-shadow" />
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground max-w-24 truncate">{scene.name}</span>
              </div>
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem onClick={() => onSceneDuplicate(scene.id)}>
                <Copy className="mr-2 h-4 w-4" />
                Duplicate
              </ContextMenuItem>
              <ContextMenuItem onClick={() => onSceneDelete(scene.id)} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        ))}
        <Button
          variant="outline"
          size="sm"
          className="h-14 w-14 shrink-0 border-dashed bg-transparent"
          onClick={onSceneAdd}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
