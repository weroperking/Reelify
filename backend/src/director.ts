import { Schema } from './mapper';

export interface MotionIR {
  duration: number;
  camera: {
    move: string;
    easing: string;
  };
  animations: Array<{
    layer: string;
    type: string;
    loop?: boolean;
    depth?: number;
  }>;
  effects: string[];
  render_mode: string;
}

export function director(schema: Schema, prompt: string): MotionIR {
  // Basic logic based on prompt and schema
  const motionIR: MotionIR = {
    duration: 5,
    camera: { move: 'static', easing: 'linear' },
    animations: [],
    effects: ['film_grain'],
    render_mode: '2D',
  };

  // Analyze prompt for camera moves
  if (prompt.toLowerCase().includes('cinematic') || prompt.toLowerCase().includes('push in')) {
    motionIR.camera = { move: 'slow_push_in', easing: 'easeInOut' };
  }

  // Add animations based on elements
  schema.elements.primary.forEach(element => {
    if (element.toLowerCase().includes('steam') || element.toLowerCase().includes('smoke')) {
      motionIR.animations.push({ layer: 'steam', type: 'float_up', loop: true });
    }
  });

  // Depth layers for parallax
  if (schema.scene.depth_layers.length > 1) {
    motionIR.animations.push({ layer: 'background', type: 'parallax', depth: 0.3 });
  }

  // Render mode
  if (prompt.toLowerCase().includes('3d') || prompt.toLowerCase().includes('orbit')) {
    motionIR.render_mode = '3D';
  } else if (schema.scene.depth_layers.length > 2) {
    motionIR.render_mode = '2.5D';
  }

  return motionIR;
}