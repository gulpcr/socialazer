## **Backend API Specification - Social Ad Creation Platform**

### **Base URL:**`/api/v1`

---

## **1. URL-to-Video Creation APIs**

### **1.1 Analyze URL**

```typescript
POST / api / v1 / analyze - url;
```

**Request:**

```json
{
  "url": "https://example.com/product"
}
```

**Response:**

```json
{
  "id": "analysis_abc123",
  "url": "https://example.com/product",
  "status": "completed",
  "extractedContent": {
    "title": "Summer Collection 2024",
    "description": "Discover our latest summer fashion...",
    "pageType": "product",
    "headlines": [
      { "text": "New Arrivals", "included": true },
      { "text": "Shop Now", "included": true }
    ],
    "valueProposition": "Premium quality at affordable prices",
    "targetAudience": "Fashion-conscious millennials",
    "keyPoints": ["Free shipping on orders over $50", "30-day return policy"]
  },
  "media": {
    "images": [
      {
        "url": "https://example.com/img1.jpg",
        "alt": "Summer dress",
        "relevance": "high",
        "selected": true
      }
    ],
    "videos": []
  },
  "branding": {
    "brandName": "Fashion Brand",
    "colors": ["#FF6B6B", "#4ECDC4", "#45B7D1"],
    "logoUrl": "https://example.com/logo.png"
  }
}
```

---

### **1.2 Generate Video Script**

```typescript
POST / api / v1 / generate - script;
```

**Request:**

```json
{
  "analysisId": "analysis_abc123",
  "config": {
    "platform": "instagram",
    "duration": 30,
    "aspectRatio": "9:16",
    "tone": "energetic",
    "voiceStyle": "conversational"
  }
}
```

**Response:**

```json
{
  "id": "script_xyz789",
  "scenes": [
    {
      "id": "scene_1",
      "order": 1,
      "duration": 3,
      "text": "Discover Summer 2024",
      "voiceOver": "Get ready for summer with our latest collection",
      "visuals": {
        "type": "image",
        "url": "https://example.com/img1.jpg",
        "animation": "fade-in"
      },
      "transition": "fade"
    }
  ],
  "totalDuration": 30
}
```

---

### **1.3 Get AI Suggestions**

```typescript
POST / api / v1 / suggestions;
```

**Request:**

```json
{
  "scriptId": "script_xyz789"
}
```

**Response:**

```json
{
  "suggestions": [
    {
      "id": "sugg_1",
      "priority": "high",
      "category": "content",
      "title": "Add urgency to CTA",
      "description": "Change 'Shop Now' to 'Limited Time - Shop Now'",
      "sceneId": "scene_3",
      "autoApplicable": true
    }
  ],
  "qualityScores": {
    "engagement": 85,
    "clarity": 92,
    "brandAlignment": 88,
    "callToAction": 78
  }
}
```

---

### **1.4 Generate Voice-Over**

```typescript
POST / api / v1 / voice - over / generate;
```

**Request:**

```json
{
  "text": "Get ready for summer with our latest collection",
  "voiceId": "elevenlabs_sarah",
  "provider": "elevenlabs",
  "settings": {
    "speed": 1.0,
    "pitch": 1.0,
    "stability": 0.75,
    "clarity": 0.85
  }
}
```

**Response:**

```json
{
  "id": "vo_123",
  "audioUrl": "https://storage.example.com/vo_123.mp3",
  "duration": 4.2,
  "format": "mp3",
  "sampleRate": 44100
}
```

---

### **1.5 Get Voice Presets**

```typescript
GET / api / v1 / voice - over / presets;
```

**Response:**

```json
{
  "presets": [
    {
      "id": "elevenlabs_sarah",
      "name": "Sarah - Friendly Female",
      "gender": "female",
      "language": "en-US",
      "provider": "elevenlabs",
      "previewUrl": "https://storage.example.com/preview_sarah.mp3",
      "tags": ["friendly", "conversational", "warm"]
    }
  ]
}
```

---

## **2. Editor APIs**

### **2.1 Create Project**

```typescript
POST / api / v1 / projects;
```

**Request:**

```json
{
  "name": "Summer Campaign",
  "scriptId": "script_xyz789",
  "config": {
    "platform": "instagram",
    "aspectRatio": "9:16",
    "duration": 30
  }
}
```

**Response:**

```json
{
  "id": "proj_456",
  "name": "Summer Campaign",
  "status": "draft",
  "createdAt": "2024-01-15T10:30:00Z",
  "layers": [],
  "scenes": []
}
```

---

### **2.2 Get Project**

```typescript
GET /api/v1/projects/:id
```

**Response:**

```json
{
  "id": "proj_456",
  "name": "Summer Campaign",
  "status": "draft",
  "config": {
    "platform": "instagram",
    "aspectRatio": "9:16",
    "duration": 30,
    "fps": 30
  },
  "layers": [
    {
      "id": "layer_1",
      "type": "text",
      "name": "Headline",
      "content": "Summer 2024",
      "style": {
        "fontSize": 48,
        "fontFamily": "Inter",
        "fontWeight": "bold",
        "color": "#FFFFFF"
      },
      "position": { "x": 50, "y": 100 },
      "timing": { "start": 0, "duration": 5 },
      "visible": true,
      "locked": false,
      "opacity": 1
    }
  ],
  "scenes": []
}
```

---

### **2.3 Update Project Layers**

```typescript
PUT /api/v1/projects/:id/layers
```

**Request:**

```json
{
  "layers": [
    {
      "id": "layer_1",
      "type": "text",
      "content": "Updated Headline",
      "position": { "x": 60, "y": 120 }
    }
  ]
}
```

**Response:**

```json
{
  "success": true,
  "updatedLayers": []
}
```

---

### **2.4 Add Layer**

```typescript
POST /api/v1/projects/:id/layers
```

**Request:**

```json
{
  "type": "image",
  "name": "Product Image",
  "content": "https://storage.example.com/product.jpg",
  "position": { "x": 0, "y": 0, "width": 500, "height": 500 },
  "timing": { "start": 2, "duration": 10 }
}
```

---

### **2.5 Delete Layer**

```typescript
DELETE /api/v1/projects/:id/layers/:layerId
```

---

### **2.6 Reorder Layers**

```typescript
PUT /api/v1/projects/:id/layers/reorder
```

**Request:**

```json
{
  "layerIds": ["layer_3", "layer_1", "layer_2"]
}
```

---

## **3. AI Magic Actions APIs**

### **3.1 Magic Resize**

```typescript
POST / api / v1 / ai / magic - resize;
```

**Request:**

```json
{
  "projectId": "proj_456",
  "targetAspectRatios": ["9:16", "1:1", "16:9"]
}
```

**Response:**

```json
{
  "variants": [
    {
      "projectId": "proj_456_916",
      "aspectRatio": "9:16",
      "previewUrl": "https://storage.example.com/preview_916.jpg"
    }
  ]
}
```

---

### **3.2 Smart Headlines**

```typescript
POST / api / v1 / ai / smart - headlines;
```

**Request:**

```json
{
  "context": {
    "brandName": "Fashion Brand",
    "productType": "clothing",
    "targetAudience": "millennials"
  },
  "count": 5
}
```

**Response:**

```json
{
  "headlines": [
    { "text": "Style Meets Comfort", "score": 0.92 },
    { "text": "Your Summer Wardrobe Awaits", "score": 0.88 }
  ]
}
```

---

### **3.3 Generate CTA**

```typescript
POST / api / v1 / ai / generate - cta;
```

**Request:**

```json
{
  "context": {
    "campaignType": "sale",
    "urgency": "high",
    "platform": "instagram"
  }
}
```

**Response:**

```json
{
  "ctas": [
    { "text": "Shop Now - 50% Off!", "score": 0.95 },
    { "text": "Limited Time - Shop Today", "score": 0.89 }
  ]
}
```

---

### **3.4 Auto Captions**

```typescript
POST / api / v1 / ai / auto - captions;
```

**Request:**

```json
{
  "audioUrl": "https://storage.example.com/vo_123.mp3",
  "language": "en"
}
```

**Response:**

```json
{
  "captions": [
    {
      "text": "Get ready for summer",
      "startTime": 0.0,
      "endTime": 1.8
    },
    {
      "text": "with our latest collection",
      "startTime": 1.8,
      "endTime": 3.5
    }
  ]
}
```

---

## **4. Asset Management APIs**

### **4.1 Upload Asset**

```typescript
POST / api / v1 / assets / upload;
```

**Request:** `multipart/form-data`

```plaintext
file: [binary]
type: "image" | "video" | "audio"
name: "product-photo.jpg"
```

**Response:**

```json
{
  "id": "asset_789",
  "url": "https://storage.example.com/asset_789.jpg",
  "type": "image",
  "name": "product-photo.jpg",
  "size": 245678,
  "dimensions": { "width": 1920, "height": 1080 },
  "createdAt": "2024-01-15T11:00:00Z"
}
```

---

### **4.2 List Assets**

```typescript
GET /api/v1/assets?type=image&page=1&limit=20
```

**Response:**

```json
{
  "assets": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

---

### **4.3 Delete Asset**

```typescript
DELETE /api/v1/assets/:id
```

---

## **5. Export & Render APIs**

### **5.1 Start Render Job**

```typescript
POST / api / v1 / render;
```

**Request:**

```json
{
  "projectId": "proj_456",
  "format": "mp4",
  "quality": "high",
  "resolution": "1080p"
}
```

**Response:**

```json
{
  "jobId": "job_render_123",
  "status": "queued",
  "estimatedTime": 120
}
```

---

### **5.2 Get Render Status**

```typescript
GET /api/v1/render/:jobId
```

**Response:**

```json
{
  "jobId": "job_render_123",
  "status": "processing",
  "progress": 65,
  "currentStep": "Encoding video",
  "outputUrl": null,
  "error": null
}
```

---

### **5.3 Download Render**

```typescript
GET /api/v1/render/:jobId/download
```

Returns the video file as binary stream.

---

## **6. Templates APIs**

### **6.1 List Templates**

```typescript
GET /api/v1/templates?platform=instagram&industry=fashion
```

**Response:**

```json
{
  "templates": [
    {
      "id": "tmpl_1",
      "name": "Fashion Promo",
      "thumbnail": "https://storage.example.com/tmpl_1.jpg",
      "platform": "instagram",
      "aspectRatio": "9:16",
      "duration": 30,
      "industry": "fashion"
    }
  ]
}
```

---

### **6.2 Create Project from Template**

```typescript
POST /api/v1/templates/:id/create-project
```

**Request:**

```json
{
  "name": "My Campaign"
}
```

**Response:**

```json
{
  "projectId": "proj_789",
  "name": "My Campaign"
}
```

---

## **7. Collaboration APIs**

### **7.1 Share Project**

```typescript
POST /api/v1/projects/:id/share
```

**Request:**

```json
{
  "permission": "view" | "edit",
  "expiresIn": 86400
}
```

**Response:**

```json
{
  "shareUrl": "https://app.example.com/shared/abc123xyz",
  "expiresAt": "2024-01-16T10:30:00Z"
}
```

---

## **Tech Stack Recommendations**

- **Web Scraping:** Puppeteer/Playwright
- **AI/LLM:** OpenAI GPT-4, Claude API
- **Voice-Over:** ElevenLabs API, Google Cloud TTS
- **Video Rendering:** FFmpeg, Remotion
- **Job Queue:** Bull/BullMQ with Redis
- **Storage:** AWS S3, Google Cloud Storage
- **Database:** PostgreSQL for metadata, Redis for caching
- **Speech-to-Text:** OpenAI Whisper, Google Speech-to-Text
