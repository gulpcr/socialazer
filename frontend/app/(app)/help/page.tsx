import { AppHeader } from "@/components/app-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Book, MessageCircle, Video, FileQuestion } from "lucide-react"

const helpResources = [
  {
    title: "Documentation",
    description: "Learn how to use AdStudio with our comprehensive guides",
    icon: Book,
    action: "Browse Docs",
  },
  {
    title: "Video Tutorials",
    description: "Watch step-by-step tutorials for common tasks",
    icon: Video,
    action: "Watch Videos",
  },
  {
    title: "FAQs",
    description: "Find answers to frequently asked questions",
    icon: FileQuestion,
    action: "View FAQs",
  },
  {
    title: "Contact Support",
    description: "Get help from our support team",
    icon: MessageCircle,
    action: "Contact Us",
  },
]

export default function HelpPage() {
  return (
    <>
      <AppHeader title="Help" />
      <main className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-2xl font-semibold tracking-tight">Help Center</h2>
          <p className="text-muted-foreground">Find resources and get support</p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {helpResources.map((resource) => (
              <Card key={resource.title}>
                <CardHeader>
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <resource.icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{resource.title}</CardTitle>
                  <CardDescription>{resource.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full bg-transparent">
                    {resource.action}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </>
  )
}
