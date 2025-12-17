import { Schema } from './mapper';
import { Timeline, Asset, Track, Layer, Keyframe, Effect, Camera, createBasicTimeline, validateMotionIR } from './schema';

export interface MotionIR {
  timeline: Timeline;
  validation: {
    isValid: boolean;
    errors: string[];
  };
}

export function director(schema: Schema, prompt: string, imagePath?: string): MotionIR {
  // Create basic timeline structure
  const timeline = createBasicTimeline(5, 1920, 1080, 30);
  
  // Determine duration from prompt (with sensible defaults)
  const duration = extractDurationFromPrompt(prompt) || 5;
  timeline.metadata.duration = duration;
  
  // Create main image asset
  const imageAsset: Asset = {
    id: 'main-image',
    type: 'image',
    src: imagePath || 'placeholder.jpg',
    metadata: {
      originalWidth: 1920,
      originalHeight: 1080,
      dominantColors: schema.scene.colors
    }
  };
  timeline.assets.push(imageAsset);
  
  // Analyze prompt for creative direction
  const creativeDirection = analyzePrompt(prompt);
  
  // Determine camera type and movements
  const camera = determineCameraMovement(creativeDirection, schema);
  timeline.camera = camera;
  
  // Create video track with main image layer
  const videoTrack: Track = {
    id: 'video-track-1',
    name: 'Main Video Track',
    index: 0,
    type: 'video',
    layers: [],
    locked: false,
    visible: true
  };
  
  // Create main image layer with animations
  const mainLayer = createMainImageLayer(imageAsset.id, duration, creativeDirection, schema);
  videoTrack.layers.push(mainLayer);
  
  // Add additional layers based on schema elements
  if (schema.elements.secondary.length > 0) {
    const secondaryLayer = createSecondaryLayer(schema.elements.secondary, duration);
    videoTrack.layers.push(secondaryLayer);
  }
  
  timeline.tracks.push(videoTrack);
  
  // Add global effects
  const globalEffects = createGlobalEffects(creativeDirection, duration);
  timeline.globalEffects = globalEffects;
  
  // Set background color based on schema
  if (schema.scene.colors.length > 0) {
    timeline.metadata.backgroundColor = schema.scene.colors[0];
  }
  
  // Validate the generated timeline
  const validation = validateMotionIR(timeline);
  
  if (!validation.isValid) {
    console.warn('Motion-IR validation warnings:', validation.errors);
  }
  
  return {
    timeline,
    validation
  };
}

function extractDurationFromPrompt(prompt: string): number | null {
  // Look for duration indicators in prompt
  const durationPatterns = [
    /(\d+)\s*seconds?/i,
    /(\d+)\s*sec/i,
    /duration[:\s]+(\d+)/i,
    /for\s+(\d+)\s*seconds?/i
  ];
  
  for (const pattern of durationPatterns) {
    const match = prompt.match(pattern);
    if (match) {
      const duration = parseInt(match[1]);
      if (duration > 0 && duration <= 30) { // Cap at 30 seconds for performance
        return duration;
      }
    }
  }
  
  return null; // Will use default duration
}

interface CreativeDirection {
  style: 'cinematic' | 'dynamic' | 'gentle' | 'dramatic' | 'minimal';
  movement: 'static' | 'pan' | 'zoom' | 'dolly' | 'orbit';
  mood: 'calm' | 'energetic' | 'mysterious' | 'uplifting' | 'tense';
  effects: string[];
}

function analyzePrompt(prompt: string): CreativeDirection {
  const lowerPrompt = prompt.toLowerCase();
  
  // Determine style
  let style: CreativeDirection['style'] = 'gentle';
  if (lowerPrompt.includes('cinematic') || lowerPrompt.includes('movie') || lowerPrompt.includes('film')) {
    style = 'cinematic';
  } else if (lowerPrompt.includes('dynamic') || lowerPrompt.includes('energetic') || lowerPrompt.includes('fast')) {
    style = 'dynamic';
  } else if (lowerPrompt.includes('dramatic') || lowerPrompt.includes('intense') || lowerPrompt.includes('powerful')) {
    style = 'dramatic';
  } else if (lowerPrompt.includes('minimal') || lowerPrompt.includes('simple') || lowerPrompt.includes('clean')) {
    style = 'minimal';
  }
  
  // Determine movement
  let movement: CreativeDirection['movement'] = 'static';
  if (lowerPrompt.includes('pan') || lowerPrompt.includes('panorama')) {
    movement = 'pan';
  } else if (lowerPrompt.includes('zoom') || lowerPrompt.includes('push in') || lowerPrompt.includes('zoom in')) {
    movement = 'zoom';
  } else if (lowerPrompt.includes('dolly') || lowerPrompt.includes('slide') || lowerPrompt.includes('move')) {
    movement = 'dolly';
  } else if (lowerPrompt.includes('orbit') || lowerPrompt.includes('rotate') || lowerPrompt.includes('spin')) {
    movement = 'orbit';
  }
  
  // Determine mood
  let mood: CreativeDirection['mood'] = 'calm';
  if (lowerPrompt.includes('energetic') || lowerPrompt.includes('exciting') || lowerPrompt.includes('vibrant')) {
    mood = 'energetic';
  } else if (lowerPrompt.includes('mysterious') || lowerPrompt.includes('dark') || lowerPrompt.includes('shadow')) {
    mood = 'mysterious';
  } else if (lowerPrompt.includes('uplifting') || lowerPrompt.includes('bright') || lowerPrompt.includes('positive')) {
    mood = 'uplifting';
  } else if (lowerPrompt.includes('tense') || lowerPrompt.includes('intense') || lowerPrompt.includes('urgent')) {
    mood = 'tense';
  }
  
  // Collect effects
  const effects: string[] = [];
  if (lowerPrompt.includes('fade') || lowerPrompt.includes('fade in') || lowerPrompt.includes('fade out')) {
    effects.push('fade');
  }
  if (lowerPrompt.includes('blur') || lowerPrompt.includes('depth of field')) {
    effects.push('blur');
  }
  if (lowerPrompt.includes('grain') || lowerPrompt.includes('film grain')) {
    effects.push('film_grain');
  }
  if (lowerPrompt.includes('color grade') || lowerPrompt.includes('color grading')) {
    effects.push('color_grade');
  }
  
  return { style, movement, mood, effects };
}

function determineCameraMovement(direction: CreativeDirection, schema: Schema): Camera {
  const camera: Camera = {
    type: '2D',
    position: { x: 0, y: 0, z: 0 },
    target: { x: 0, y: 0, z: 0 },
    movements: []
  };
  
  // Determine if we need 3D based on prompt or schema complexity
  if (direction.style === 'cinematic' || schema.scene.depth_layers.length > 2) {
    camera.type = '2.5D';
  }
  
  // Add movement based on direction
  if (direction.movement !== 'static') {
    const duration = 5; // Default duration, will be overridden by timeline
    const startTime = 0.5; // Start movement after initial delay
    
    camera.movements.push({
      type: direction.movement,
      from: { x: 0, y: 0, z: 0 },
      to: direction.movement === 'pan' ? { x: 100, y: 0, z: 0 } :
           direction.movement === 'zoom' ? { x: 0, y: 0, z: -200 } :
           direction.movement === 'dolly' ? { x: 0, y: 0, z: 150 } :
           { x: 0, y: 0, z: 0 },
      startTime,
      duration: duration - startTime,
      easing: direction.style === 'cinematic' ? 'easeInOut' : 'linear'
    });
  }
  
  return camera;
}

function createMainImageLayer(
  assetId: string, 
  duration: number, 
  direction: CreativeDirection, 
  schema: Schema
): Layer {
  const layer: Layer = {
    id: 'main-image-layer',
    name: 'Main Image',
    type: 'image',
    assetId,
    trackIndex: 0,
    startTime: 0,
    duration,
    keyframes: [],
    effects: [],
    visible: true
  };
  
  // Create fade in effect
  const fadeInEffect: Effect = {
    id: 'fade-in',
    type: 'fade',
    parameters: {
      type: 'in',
      duration: 0.5
    },
    startTime: 0,
    duration: 0.5
  };
  layer.effects.push(fadeInEffect);
  
  // Create fade out effect
  const fadeOutEffect: Effect = {
    id: 'fade-out',
    type: 'fade',
    parameters: {
      type: 'out',
      duration: 0.5
    },
    startTime: duration - 0.5,
    duration: 0.5
  };
  layer.effects.push(fadeOutEffect);
  
  // Add movement keyframes based on direction
  if (direction.movement === 'zoom') {
    layer.keyframes.push({
      time: 0,
      properties: { scale: { x: 1, y: 1 }, opacity: 1 }
    });
    layer.keyframes.push({
      time: duration * 0.7,
      properties: { scale: { x: 1.2, y: 1.2 }, opacity: 1 }
    });
  } else if (direction.movement === 'pan') {
    layer.keyframes.push({
      time: 0,
      properties: { position: { x: 0, y: 0 }, opacity: 1 }
    });
    layer.keyframes.push({
      time: duration * 0.6,
      properties: { position: { x: 100, y: 0 }, opacity: 1 }
    });
  }
  
  // Add opacity effects based on mood
  if (direction.mood === 'mysterious') {
    layer.effects.push({
      id: 'dark-overlay',
      type: 'opacity',
      parameters: { opacity: 0.8 },
      startTime: 0,
      duration
    });
  }
  
  return layer;
}

function createSecondaryLayer(elements: string[], duration: number): Layer {
  const layer: Layer = {
    id: 'secondary-elements-layer',
    name: 'Secondary Elements',
    type: 'composition',
    trackIndex: 0,
    startTime: 0,
    duration,
    keyframes: [],
    effects: [],
    visible: true
  };
  
  // Add subtle parallax effect for secondary elements
  layer.keyframes.push({
    time: 0,
    properties: { position: { x: 0, y: 0 }, opacity: 0.7 }
  });
  layer.keyframes.push({
    time: duration,
    properties: { position: { x: 20, y: 0 }, opacity: 0.7 }
  });
  
  return layer;
}

function createGlobalEffects(direction: CreativeDirection, duration: number): Effect[] {
  const effects: Effect[] = [];
  
  // Always add film grain for cinematic feel
  if (direction.style === 'cinematic') {
    effects.push({
      id: 'film-grain',
      type: 'filmGrain',
      parameters: {
        intensity: 0.1,
        opacity: 0.3
      },
      startTime: 0,
      duration
    });
  }
  
  // Add color grading based on mood
  if (direction.mood === 'uplifting') {
    effects.push({
      id: 'warm-color-grade',
      type: 'colorGrade',
      parameters: {
        temperature: 0.2,
        saturation: 0.1
      },
      startTime: 0,
      duration
    });
  } else if (direction.mood === 'mysterious') {
    effects.push({
      id: 'cool-color-grade',
      type: 'colorGrade',
      parameters: {
        temperature: -0.2,
        saturation: -0.1,
        contrast: 0.1
      },
      startTime: 0,
      duration
    });
  }
  
  return effects;
}