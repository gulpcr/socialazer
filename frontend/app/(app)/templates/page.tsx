"use client"

import { useState } from "react"
import { Search, Filter } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { AppHeader } from "@/components/app-header"
import { TemplateCard } from "@/components/template-card"
import { mockTemplates } from "@/lib/mock-data"

const platforms = ["all", "reels", "shorts", "feed"] as const
const industries = ["E-commerce", "Retail", "Fashion", "Lifestyle", "Beauty"]

export default function TemplatesPage() {
  const [search, setSearch] = useState("")
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([])

  const filteredTemplates = mockTemplates.filter((template) => {
    const matchesSearch = template.name.toLowerCase().includes(search.toLowerCase())
    const matchesPlatform =
      selectedPlatforms.length === 0 || selectedPlatforms.includes(template.platform) || template.platform === "all"
    const matchesIndustry = selectedIndustries.length === 0 || selectedIndustries.includes(template.industry)
    return matchesSearch && matchesPlatform && matchesIndustry
  })

  return (
    <>
      <AppHeader title="Templates" />
      <main className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-semibold tracking-tight">Choose a Template</h2>
            <p className="text-muted-foreground">Start with a professional template and customize it to your brand</p>
          </div>

          {/* Filters */}
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search templates..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2 bg-transparent">
                    <Filter className="h-4 w-4" />
                    Platform
                    {selectedPlatforms.length > 0 && (
                      <span className="ml-1 rounded-full bg-primary px-1.5 text-xs text-primary-foreground">
                        {selectedPlatforms.length}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuLabel>Platform</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {platforms
                    .filter((p) => p !== "all")
                    .map((platform) => (
                      <DropdownMenuCheckboxItem
                        key={platform}
                        checked={selectedPlatforms.includes(platform)}
                        onCheckedChange={(checked) => {
                          setSelectedPlatforms(
                            checked
                              ? [...selectedPlatforms, platform]
                              : selectedPlatforms.filter((p) => p !== platform),
                          )
                        }}
                      >
                        {platform.charAt(0).toUpperCase() + platform.slice(1)}
                      </DropdownMenuCheckboxItem>
                    ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2 bg-transparent">
                    Industry
                    {selectedIndustries.length > 0 && (
                      <span className="ml-1 rounded-full bg-primary px-1.5 text-xs text-primary-foreground">
                        {selectedIndustries.length}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuLabel>Industry</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {industries.map((industry) => (
                    <DropdownMenuCheckboxItem
                      key={industry}
                      checked={selectedIndustries.includes(industry)}
                      onCheckedChange={(checked) => {
                        setSelectedIndustries(
                          checked
                            ? [...selectedIndustries, industry]
                            : selectedIndustries.filter((i) => i !== industry),
                        )
                      }}
                    >
                      {industry}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Template Grid */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {filteredTemplates.map((template) => (
              <TemplateCard key={template.id} template={template} />
            ))}
          </div>

          {filteredTemplates.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground">No templates found</p>
              <Button
                variant="link"
                onClick={() => {
                  setSearch("")
                  setSelectedPlatforms([])
                  setSelectedIndustries([])
                }}
              >
                Clear filters
              </Button>
            </div>
          )}
        </div>
      </main>
    </>
  )
}
