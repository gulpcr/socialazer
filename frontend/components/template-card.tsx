"use client"

import Image from "next/image"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Template } from "@/lib/types"

interface TemplateCardProps {
  template: Template
}

export function TemplateCard({ template }: TemplateCardProps) {
  return (
    <Link href={`/editor/new?template=${template.id}`}>
      <Card className="group overflow-hidden transition-all hover:shadow-md hover:ring-2 hover:ring-primary/20">
        <div className="relative aspect-[9/16] bg-muted">
          <Image
            src={template.thumbnail || "/placeholder.svg"}
            alt={template.name}
            fill
            className="object-cover transition-transform group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/5" />
        </div>
        <CardContent className="p-3">
          <h3 className="text-sm font-medium">{template.name}</h3>
          <div className="mt-2 flex flex-wrap gap-1">
            {template.formats.map((format) => (
              <Badge key={format} variant="secondary" className="text-[10px] px-1.5 py-0">
                {format}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
