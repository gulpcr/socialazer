// Editor-specific types for layers and elements

export type LayerType = "text" | "image" | "video" | "audio" | "shape"

export interface LayerPosition {
  x: number
  y: number
  width: number
  height: number
  rotation: number
}

export interface LayerStyle {
  // Text styles
  fontSize?: number
  fontWeight?: string
  fontFamily?: string
  color?: string
  textAlign?: "left" | "center" | "right"
  // Common styles
  backgroundColor?: string
  opacity?: number
  borderRadius?: number
  // Shadow
  shadow?: boolean
  shadowColor?: string
  shadowBlur?: number
}

export interface LayerTiming {
  startTime: number
  endTime: number
  duration: number
}

export interface Layer {
  id: string
  name: string
  type: LayerType
  visible: boolean
  locked: boolean
  content: string // text content, image url, video url, etc.
  position: LayerPosition
  style: LayerStyle
  timing: LayerTiming
  thumbnail?: string
}

export interface EditorState {
  layers: Layer[]
  selectedLayerId: string | null
  isPlaying: boolean
  currentTime: number
  aspectRatio: "9:16" | "1:1" | "16:9"
}
