import type { Ad, Template, Asset, VoiceOption } from "./types"

export const mockAds: Ad[] = [
  {
    id: "1",
    name: "Summer Sale Campaign",
    thumbnail: "/colorful-summer-sale-ad-with-beach-vibes.jpg",
    status: "ready",
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2024-01-15T12:30:00Z",
    templateId: "1",
    aspectRatio: "9:16",
  },
  {
    id: "2",
    name: "Product Launch Teaser",
    thumbnail: "/sleek-product-launch-teaser-dark-theme.jpg",
    status: "rendering",
    createdAt: "2024-01-14T14:00:00Z",
    updatedAt: "2024-01-14T16:00:00Z",
    templateId: "2",
    aspectRatio: "9:16",
  },
  {
    id: "3",
    name: "Holiday Special",
    thumbnail: "/festive-holiday-special-ad-with-snowflakes.jpg",
    status: "draft",
    createdAt: "2024-01-13T09:00:00Z",
    updatedAt: "2024-01-13T11:00:00Z",
    templateId: "3",
    aspectRatio: "1:1",
  },
  {
    id: "4",
    name: "Flash Deal Alert",
    thumbnail: "/urgent-flash-deal-countdown-timer.jpg",
    status: "failed",
    createdAt: "2024-01-12T08:00:00Z",
    updatedAt: "2024-01-12T08:30:00Z",
    templateId: "1",
    aspectRatio: "9:16",
  },
]

export const mockTemplates: Template[] = [
  {
    id: "1",
    name: "Bold Announcement",
    thumbnail: "/bold-announcement-template-with-dynamic-text.jpg",
    formats: ["9:16", "1:1"],
    platform: "reels",
    industry: "E-commerce",
  },
  {
    id: "2",
    name: "Product Showcase",
    thumbnail: "/elegant-product-showcase-template.jpg",
    formats: ["9:16", "1:1", "16:9"],
    platform: "all",
    industry: "Retail",
  },
  {
    id: "3",
    name: "Story Promo",
    thumbnail: "/instagram-story-promo-template-colorful.jpg",
    formats: ["9:16"],
    platform: "reels",
    industry: "Fashion",
  },
  {
    id: "4",
    name: "Minimalist Quote",
    thumbnail: "/minimalist-quote-template-clean-design.jpg",
    formats: ["1:1"],
    platform: "feed",
    industry: "Lifestyle",
  },
  {
    id: "5",
    name: "Sale Countdown",
    thumbnail: "/countdown-timer-sale-template-urgent.jpg",
    formats: ["9:16", "1:1"],
    platform: "shorts",
    industry: "E-commerce",
  },
  {
    id: "6",
    name: "Before & After",
    thumbnail: "/before-after-comparison-template-split-screen.jpg",
    formats: ["9:16"],
    platform: "reels",
    industry: "Beauty",
  },
]

export const mockAssets: Asset[] = [
  {
    id: "1",
    name: "Product Photo 1",
    type: "image",
    url: "/product-photo-white-background.jpg",
    thumbnail: "/product-photo-white-background.jpg",
    createdAt: "2024-01-10T10:00:00Z",
  },
  {
    id: "2",
    name: "Brand Logo",
    type: "image",
    url: "/modern-brand-logo.jpg",
    thumbnail: "/modern-brand-logo.jpg",
    createdAt: "2024-01-09T09:00:00Z",
  },
  {
    id: "3",
    name: "Promo Video Clip",
    type: "video",
    url: "/video-clip-thumbnail-play-button.jpg",
    thumbnail: "/video-clip-thumbnail-play-button.jpg",
    createdAt: "2024-01-08T14:00:00Z",
  },
  {
    id: "4",
    name: "Background Music",
    type: "audio",
    url: "/audio.mp3",
    createdAt: "2024-01-07T11:00:00Z",
  },
]

export const mockVoices: VoiceOption[] = [
  { id: "1", name: "Aria", language: "English (US)", gender: "female" },
  { id: "2", name: "Marcus", language: "English (US)", gender: "male" },
  { id: "3", name: "Sofia", language: "English (UK)", gender: "female" },
  { id: "4", name: "James", language: "English (UK)", gender: "male" },
  { id: "5", name: "Nova", language: "English (US)", gender: "neutral" },
]
