// Motion Intermediate Representation (Motion-IR) Schema
// This defines the standard data structure for video timeline generation

export interface Asset {
  id: string;
  type: 'image' | 'video' | 'audio' | 'text';
  src: string;
  metadata?: Record<string, any>;
}

export interface Keyframe {
  time: number; // seconds
  properties: {
    position?: { x: number; y: number; z?: number };
    scale?: { x: number; y: number; z?: number };
    rotation?: { x: number; y: number; z?: number };
    opacity?: number;
    color?: string;
    filter?: string;
  };
  easing?: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | 'spring';
}

export interface Effect {
  id: string;
  type: 'zoom' | 'pan' | 'opacity' | 'slide' | 'fade' | 'blur' | 'colorGrade' | 'filmGrain';
  parameters: Record<string, number | string | boolean>;
  startTime: number;
  duration: number;
}

export interface Layer {
  id: string;
  name: string;
  type: 'image' | 'text' | 'shape' | 'composition';
  assetId?: string;
  trackIndex: number;
  startTime: number;
  duration: number;
  keyframes: Keyframe[];
  effects: Effect[];
  blendMode?: 'normal' | 'multiply' | 'screen' | 'overlay';
  visible: boolean;
}

export interface Track {
  id: string;
  name: string;
  index: number;
  type: 'video' | 'audio' | 'effect';
  layers: Layer[];
  locked: boolean;
  visible: boolean;
}

export interface Camera {
  type: '2D' | '2.5D' | '3D';
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
  fov?: number; // for 3D
  movements: Array<{
    type: 'static' | 'pan' | 'zoom' | 'dolly' | 'orbit' | 'tracking';
    from: { x: number; y: number; z: number };
    to: { x: number; y: number; z: number };
    startTime: number;
    duration: number;
    easing: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | 'spring';
  }>;
}

export interface Timeline {
  version: '1.0';
  metadata: {
    projectName: string;
    createdAt: string;
    duration: number;
    fps: number;
    width: number;
    height: number;
    backgroundColor?: string;
  };
  assets: Asset[];
  tracks: Track[];
  camera: Camera;
  globalEffects: Effect[];
}

// Utility functions for validation
export function validateMotionIR(timeline: Timeline): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Basic validation
  if (!timeline.assets || timeline.assets.length === 0) {
    errors.push('Timeline must have at least one asset');
  }

  if (!timeline.tracks || timeline.tracks.length === 0) {
    errors.push('Timeline must have at least one track');
  }

  // Validate timeline duration
  const maxLayerEnd = Math.max(
    ...timeline.tracks.flatMap(track => 
      track.layers.map(layer => layer.startTime + layer.duration)
    ),
    0
  );

  if (maxLayerEnd > timeline.metadata.duration) {
    errors.push('Some layers extend beyond timeline duration');
  }

  // Validate keyframes
  timeline.tracks.forEach((track, trackIndex) => {
    track.layers.forEach((layer, layerIndex) => {
      layer.keyframes.forEach((keyframe, kfIndex) => {
        if (keyframe.time < 0 || keyframe.time > timeline.metadata.duration) {
          errors.push(`Keyframe ${kfIndex} in layer ${layerIndex} of track ${trackIndex} has invalid time`);
        }
      });
    });
  });

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Helper function to create a basic timeline structure
export function createBasicTimeline(
  duration: number = 5,
  width: number = 1920,
  height: number = 1080,
  fps: number = 30
): Timeline {
  return {
    version: '1.0',
    metadata: {
      projectName: 'Motion-IR Generated Video',
      createdAt: new Date().toISOString(),
      duration,
      fps,
      width,
      height,
      backgroundColor: '#000000'
    },
    assets: [],
    tracks: [],
    camera: {
      type: '2D',
      position: { x: 0, y: 0, z: 0 },
      target: { x: 0, y: 0, z: 0 },
      movements: []
    },
    globalEffects: []
  };
}