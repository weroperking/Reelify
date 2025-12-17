# Reelify - Image-to-Video Animation System

## Pipeline Overview

User Input → [Mapper] → [Schema] → [Director] → [Motion-IR] → [Coder] → Rendered Video

---

## 1. Mapper (Vision Analysis)

Analyzes the uploaded image like a VLM, extracting all visual elements.

Example Input: "Make this coffee shop photo cinematic"

---

## 2. Schema (JSON Structure)

{
  "elements": {
    "primary": ["barista", "espresso machine"],
    "secondary": ["coffee cups", "steam", "wooden counter"]
  },
  "scene": {
    "emotion": "warm, cozy",
    "lighting": "soft morning light, window-lit",
    "colors": ["brown", "cream", "warm orange"],
    "depth_layers": ["foreground:counter", "mid:barista", "back:shelves"]
  },
  "composition": {
    "focus": "barista hands",
    "perspective": "eye-level, shallow DOF",
    "style": "lifestyle photography"
  }
}

---

## 3. Director → Motion-IR

Transforms static analysis into animation instructions:

{
  "duration": 5,
  "camera": { "move": "slow_push_in", "easing": "easeInOut" },
  "animations": [
    { "layer": "steam", "type": "float_up", "loop": true },
    { "layer": "background", "type": "parallax", "depth": 0.3 }
  ],
  "effects": ["film_grain", "warm_grade"],
  "render_mode": "2.5D"
}

---

## 4. Coder (Remotion + R3F)

Converts Motion-IR to executable code:

- Simple animations → Remotion (<Img>, <spring>, interpolate)
- 2.5D/3D scenes → React-Three-Fiber inside Remotion
- Complex motion → Three.js depth planes, camera rigs

Example: Parallax coffee shop with floating steam particles, subtle zoom, and film grain overlay.

---

## User Options

- "animate only the steam"
- "make it full 3D with camera orbit"
- "add text overlay with fade-in"
- "loop the background subtly"

---

## File Outputs

| Stage      | Output Format |
|------------|---------------|
| Mapper     | JSON          |
| Schema     | JSON          |
| Motion-IR  | JSON          |
| Coder      | TSX/JSX       |
| Final      | MP4/WebM      |