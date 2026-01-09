Script PATCH API - Complete Guide

Overview

The PATCH endpoint allows flexible script modifications through 5 different operations that can be used independently or combined in a single request.

Endpoint: PATCH /api/scripts/update-script
🎯 5 Update Operations

1. Replace Entire Scenes Array
Replace all scenes with a new array. Useful for complete script rewrites.
json{
  "scenes": [
    {
      "id": "scene_1",
      "order": 1,
      "duration": 5,
      "text": "Welcome to Summer 2024",
      "voiceOver": "Get ready for our amazing summer collection",
      "visuals": {
        "type": "image",
        "url": "https://example.com/img1.jpg",
        "animation": "fade-in"
      },
      "transition": "fade"
    },
    {
      "id": "scene_2",
      "order": 2,
      "duration": 5,
      "text": "Shop Now",
      "voiceOver": "Visit our website today",
      "visuals": {
        "type": "image",
        "url": "https://example.com/img2.jpg",
        "animation": "zoom-in"
      },
      "transition": "dissolve"
    }
  ]
}
Result: Completely replaces the script with new scenes, recalculates duration and order.

2. Update Specific Scenes
Modify individual scenes by ID without affecting others.
json{
  "updateScenes": [
    {
      "id": "scene_1",
      "text": "Updated text for scene 1",
      "duration": 6
    },
    {
      "id": "scene_3",
      "voiceOver": "New voiceover for scene 3",
      "visuals": {
        "animation": "slide-up"
      }
    }
  ]
}
Properties you can update:

text - On-screen text
voiceOver - Narration script
duration - Scene length in seconds
visuals.url - Image URL
visuals.animation - Animation style
transition - Transition effect

Note: Partial updates are supported - only specified fields are changed.

3. Add New Scenes
Insert scenes at specific positions.
json{
  "addScenes": [
    {
      "position": 1,
      "text": "New Scene",
      "voiceOver": "This is a brand new scene",
      "duration": 4,
      "visuals": {
        "type": "image",
        "url": "https://example.com/new-img.jpg",
        "animation": "fade-in"
      },
      "transition": "cut"
    }
  ]
}
Parameters:

position (optional) - Index where scene should be inserted (0-based)
If not provided, scene is added at the end
All other scene properties are required

Example positions:

position: 0 - Insert at beginning (becomes scene 1)
position: 1 - Insert after first scene (becomes scene 2)
No position - Insert at end


4. Remove Scenes
Delete specific scenes by ID.
json{
  "removeScenes": ["scene_2", "scene_4"]
}
Result:

Specified scenes are removed
Remaining scenes are renumbered sequentially
Total duration is recalculated


5. Reorder Scenes
Change scene sequence by specifying new order.
json{
  "reorderScenes": ["scene_3", "scene_1", "scene_2", "scene_4"]
}
Rules:

Provide scene IDs in desired order
All existing scenes not listed will be appended at the end
Scene order numbers are automatically updated (1, 2, 3, ...)


🔀 Combining Operations
You can combine multiple operations in a single PATCH request. Operations are executed in this order:

Replace scenes (if scenes provided)
Update specific scenes
Add new scenes
Remove scenes
Reorder scenes
Normalize order numbers
Recalculate total duration

Example: Complex Update
json{
  "updateScenes": [
    {
      "id": "scene_1",
      "duration": 7,
      "text": "Extended opening"
    }
  ],
  "addScenes": [
    {
      "position": 2,
      "text": "Mid-roll CTA",
      "voiceOver": "Visit us today for exclusive deals",
      "duration": 3,
      "visuals": {
        "type": "image",
        "url": "https://example.com/cta.jpg",
        "animation": "zoom-in"
      },
      "transition": "fade"
    }
  ],
  "removeScenes": ["scene_5"],
  "reorderScenes": ["scene_1", "scene_new", "scene_2", "scene_3", "scene_4"]
}

📋 Scene Structure Reference
Complete Scene Object
json{
  "id": "scene_1",           // Required - Unique identifier
  "order": 1,                // Auto-generated - Scene sequence
  "duration": 5,             // Required - Scene length in seconds
  "text": "On-screen text",  // Optional - Caption/text overlay
  "voiceOver": "Narration",  // Optional - Spoken content
  "visuals": {               // Required - Visual content
    "type": "image",         // "image" or "video"
    "url": "https://...",    // Required - Media URL
    "animation": "fade-in"   // Optional - Animation style
  },
  "transition": "fade"       // Optional - Transition to next scene
}
Available Animations

fade-in - Gradual appearance
zoom-in - Zoom into image
zoom-out - Zoom out from image
slide-up - Slide up from bottom
pan - Pan across image

Available Transitions

fade - Smooth fade between scenes
cut - Instant cut
dissolve - Cross-dissolve
slide - Slide transition


🎬 Usage Examples

Example 1: Change Text on Multiple Scenes
bashcurl -X PATCH http://localhost:3000/api/scripts/update-script \
  -H "Content-Type: application/json" \
  -d '{
    "updateScenes": [
      { "id": "scene_1", "text": "Summer Sale 2024" },
      { "id": "scene_3", "text": "Limited Time Only" }
    ]
  }'

Example 2: Extend Scene Duration
bashcurl -X PATCH http://localhost:3000/api/scripts/update-script \
  -H "Content-Type: application/json" \
  -d '{
    "updateScenes": [
      { "id": "scene_2", "duration": 8 }
    ]
  }'

Example 3: Add CTA Scene at End
bashcurl -X PATCH http://localhost:3000/api/scripts/update-script \
  -H "Content-Type: application/json" \
  -d '{
    "addScenes": [
      {
        "text": "Shop Now",
        "voiceOver": "Visit our store today",
        "duration": 4,
        "visuals": {
          "type": "image",
          "url": "https://example.com/cta.jpg",
          "animation": "zoom-in"
        }
      }
    ]
  }'

Example 4: Remove Intro Scene
bashcurl -X PATCH http://localhost:3000/api/scripts/update-script \
  -H "Content-Type: application/json" \
  -d '{
    "removeScenes": ["scene_1"]
  }'

Example 5: Reorder for Better Flow
bashcurl -X PATCH http://localhost:3000/api/scripts/update-script \
  -H "Content-Type: application/json" \
  -d '{
    "reorderScenes": ["scene_3", "scene_1", "scene_2"]
  }'

✅ Response Format

Success Response

json{
  "success": true,
  "message": "Script updated successfully",
  "operations": ["updateScenes", "addScenes"],
  "data": {
    "id": "script_abc123",
    "scenes": [...],
    "totalDuration": 35,
    "createdAt": "2026-01-06T12:00:00.000Z",
    "updatedAt": "2026-01-06T12:30:00.000Z"
  }
}

Error Response
json{
  "success": false,
  "message": "Failed to update script",
  "error": "Scene with ID scene_5 not found"
}

🛡️ Validation Rules

Scene IDs must exist when using updateScenes or removeScenes
Position must be valid when adding scenes (0 to scenes.length)
Duration must be positive number
Visuals.url is required for new scenes
At least one operation must be provided
Total duration is auto-recalculated after all operations


💡 Best Practices

Use updateScenes for minor changes - More efficient than replacing all
Test scene order after reordering - Verify the sequence makes sense
Maintain scene IDs - Don't change IDs manually, let the system manage them
Check total duration - Ensure it matches your platform requirements
Combine operations - Batch multiple changes in one request for efficiency


🔄 Operation Flow
1. Load current script from CSV
2. Apply operations in sequence:
   - Replace scenes (if provided)
   - Update specific scenes
   - Add new scenes
   - Remove scenes
   - Reorder scenes
3. Normalize order numbers (1, 2, 3, ...)
4. Recalculate total duration
5. Save updated script to CSV
6. Return updated script

🎯 Common Use Cases
Use Case                            Operation
Fix typo in text                    updateScenes
Change voiceover                    updateScenes
Add opening hook                    addScenes (position: 0)
Add closing CTA                     addScenes (no position)
Remove unwanted scene               removeScenes
Rearrange for better flow           reorderScenes
Complete rewrite                    scenes
Extend scene timing                 updateScenes (duration)
Change visual                       updateScenes (visuals.url)
Update animation                    updateScenes (visuals.animation)