"use client"

import { useState } from "react"
import Image from "next/image"
import { Upload, ImageIcon, Video, Music, MoreHorizontal, Trash2, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { AppHeader } from "@/components/app-header"
import { mockAssets } from "@/lib/mock-data"
import type { Asset } from "@/lib/types"

function AssetItem({ asset }: { asset: Asset }) {
  return (
    <Card className="group relative overflow-hidden">
      <div className="aspect-square bg-muted">
        {asset.type === "audio" ? (
          <div className="flex h-full items-center justify-center">
            <Music className="h-8 w-8 text-muted-foreground" />
          </div>
        ) : (
          <Image src={asset.thumbnail || asset.url} alt={asset.name} fill className="object-cover" />
        )}
        {asset.type === "video" && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="rounded-full bg-black/50 p-2">
              <Video className="h-4 w-4 text-white" />
            </div>
          </div>
        )}
      </div>
      <div className="absolute right-1 top-1 opacity-0 transition-opacity group-hover:opacity-100">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="icon" className="h-7 w-7">
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Download className="mr-2 h-4 w-4" />
              Download
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="p-2">
        <p className="truncate text-xs font-medium">{asset.name}</p>
        <p className="text-[10px] text-muted-foreground">{new Date(asset.createdAt).toLocaleDateString()}</p>
      </div>
    </Card>
  )
}

export default function AssetsPage() {
  const [activeTab, setActiveTab] = useState("all")

  const filteredAssets = activeTab === "all" ? mockAssets : mockAssets.filter((a) => a.type === activeTab)

  return (
    <>
      <AppHeader title="Assets" />
      <main className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Asset Library</h2>
              <p className="text-muted-foreground">Manage your images, videos, and audio files</p>
            </div>
            <Button className="gap-2">
              <Upload className="h-4 w-4" />
              Upload
            </Button>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="image" className="gap-2">
                <ImageIcon className="h-3 w-3" />
                Images
              </TabsTrigger>
              <TabsTrigger value="video" className="gap-2">
                <Video className="h-3 w-3" />
                Videos
              </TabsTrigger>
              <TabsTrigger value="audio" className="gap-2">
                <Music className="h-3 w-3" />
                Audio
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-4">
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
                {filteredAssets.map((asset) => (
                  <AssetItem key={asset.id} asset={asset} />
                ))}
              </div>
              {filteredAssets.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-muted-foreground">No assets found</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </>
  )
}
