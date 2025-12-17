import React from 'react';
import { Timeline, Layer, Keyframe, Effect, Camera } from './schema';
import { MotionIR } from './director';

export interface RemotionComposition {
  component: React.ComponentType<any>;
  compositionId: string;
  metadata: {
    width: number;
    height: number;
    fps: number;
    duration: number;
  };
}

interface AnimationConfig {
  property: string;
  keyframes: Array<{ time: number; value: any; easing?: string }>;
}

export async function coder(motionIR: MotionIR): Promise<RemotionComposition> {
  const { timeline } = motionIR;
  
  // Create the main composition component
  const CompositionComponent = createCompositionComponent(timeline);
  
  return {
    component: CompositionComponent,
    compositionId: 'dynamic-composition',
    metadata: {
      width: timeline.metadata.width,
      height: timeline.metadata.height,
      fps: timeline.metadata.fps,
      duration: timeline.metadata.duration
    }
  };
}

function createCompositionComponent(timeline: Timeline): React.ComponentType<any> {
  return function DynamicComposition(props: { imageSrc?: string }) {
    const { imageSrc } = props;
    
    // Get main image asset
    const mainImageAsset = timeline.assets.find(asset => asset.type === 'image');
    const imageUrl = imageSrc || mainImageAsset?.src || 'placeholder.jpg';
    
    return (
      <div 
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: timeline.metadata.backgroundColor || '#000000',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {timeline.tracks.map((track, trackIndex) => (
          <div key={track.id} style={{ position: 'absolute', width: '100%', height: '100%' }}>
            {track.layers.map((layer, layerIndex) => (
              <LayerComponent
                key={`${layer.id}-${layerIndex}`}
                layer={layer}
                imageUrl={imageUrl}
                timeline={timeline}
              />
            ))}
          </div>
        ))}
        
        {timeline.globalEffects.map((effect) => (
          <EffectComponent
            key={effect.id}
            effect={effect}
            timeline={timeline}
          />
        ))}
      </div>
    );
  };
}

function LayerComponent({ 
  layer, 
  imageUrl, 
  timeline 
}: { 
  layer: Layer; 
  imageUrl: string; 
  timeline: Timeline; 
}) {
  // Calculate animation progress based on current time
  const currentTime = 0; // This would be managed by Remotion's useCurrentFrame()
  
  const animatedStyle = calculateAnimatedStyle(layer, currentTime);
  
  if (layer.type === 'image' && layer.assetId) {
    return (
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          ...animatedStyle,
          opacity: animatedStyle.opacity || 1
        }}
      >
        <img
          src={imageUrl}
          alt={layer.name}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: `scale(${animatedStyle.scaleX || 1}, ${animatedStyle.scaleY || 1}) translate(${animatedStyle.positionX || 0}px, ${animatedStyle.positionY || 0}px)`,
            filter: animatedStyle.filter || 'none'
          }}
        />
      </div>
    );
  }
  
  // For other layer types (text, shapes, etc.)
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        ...animatedStyle
      }}
    >
      {layer.name}
    </div>
  );
}

function EffectComponent({ 
  effect, 
  timeline 
}: { 
  effect: Effect; 
  timeline: Timeline; 
}) {
  const currentTime = 0; // This would be managed by Remotion's useCurrentFrame()
  
  // Only render effect if it's active at current time
  if (currentTime < effect.startTime || currentTime > effect.startTime + effect.duration) {
    return null;
  }
  
  const effectStyle = calculateEffectStyle(effect, currentTime);
  
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        ...effectStyle
      }}
    />
  );
}

// Extended style interface to handle our custom properties
interface AnimatedStyle extends React.CSSProperties {
  scaleX?: number;
  scaleY?: number;
  positionX?: number;
  positionY?: number;
  filter?: string;
}

function calculateAnimatedStyle(layer: Layer, currentTime: number): AnimatedStyle {
  const style: AnimatedStyle = {};
  
  // Find active keyframes
  const activeKeyframes = layer.keyframes.filter(kf => 
    kf.time <= currentTime && (
      // Get the next keyframe or use this one if it's the last
      layer.keyframes.find(nextKf => nextKf.time > currentTime) === undefined ||
      layer.keyframes.find(nextKf => nextKf.time > currentTime)?.time === kf.time
    )
  );
  
  if (activeKeyframes.length === 0) return style;
  
  const currentKeyframe = activeKeyframes[activeKeyframes.length - 1];
  const nextKeyframe = layer.keyframes.find(kf => kf.time > currentTime);
  
  if (!nextKeyframe) {
    // Use current keyframe values
    Object.assign(style, keyframeToStyle(currentKeyframe));
  } else {
    // Interpolate between keyframes
    const progress = (currentTime - currentKeyframe.time) / (nextKeyframe.time - currentKeyframe.time);
    const easedProgress = applyEasing(progress, currentKeyframe.easing || 'linear');
    
    const interpolatedStyle = interpolateKeyframes(currentKeyframe, nextKeyframe, easedProgress);
    Object.assign(style, keyframeToStyle(interpolatedStyle));
  }
  
  return style;
}

function keyframeToStyle(keyframe: Keyframe): AnimatedStyle {
  const style: AnimatedStyle = {};
  
  if (keyframe.properties.position) {
    style.positionX = keyframe.properties.position.x;
    style.positionY = keyframe.properties.position.y;
  }
  
  if (keyframe.properties.scale) {
    style.scaleX = keyframe.properties.scale.x;
    style.scaleY = keyframe.properties.scale.y;
  }
  
  if (keyframe.properties.rotation) {
    style.transform = `rotate(${keyframe.properties.rotation.z || 0}deg)`;
  }
  
  if (keyframe.properties.opacity !== undefined) {
    style.opacity = keyframe.properties.opacity;
  }
  
  if (keyframe.properties.filter) {
    style.filter = keyframe.properties.filter;
  }
  
  if (keyframe.properties.color) {
    style.color = keyframe.properties.color;
  }
  
  return style;
}

function interpolateKeyframes(from: Keyframe, to: Keyframe, progress: number): Keyframe {
  const interpolated: Keyframe = {
    time: from.time,
    properties: { ...from.properties }
  };
  
  // Interpolate position
  if (from.properties.position && to.properties.position) {
    interpolated.properties.position = {
      x: from.properties.position.x + (to.properties.position.x - from.properties.position.x) * progress,
      y: from.properties.position.y + (to.properties.position.y - from.properties.position.y) * progress,
      z: from.properties.position.z && to.properties.position.z 
        ? from.properties.position.z + (to.properties.position.z - from.properties.position.z) * progress 
        : undefined
    };
  }
  
  // Interpolate scale
  if (from.properties.scale && to.properties.scale) {
    interpolated.properties.scale = {
      x: from.properties.scale.x + (to.properties.scale.x - from.properties.scale.x) * progress,
      y: from.properties.scale.y + (to.properties.scale.y - from.properties.scale.y) * progress,
      z: from.properties.scale.z && to.properties.scale.z 
        ? from.properties.scale.z + (to.properties.scale.z - from.properties.scale.z) * progress 
        : undefined
    };
  }
  
  // Interpolate rotation with proper null checks
  if (from.properties.rotation && to.properties.rotation) {
    const fromZ = from.properties.rotation.z || 0;
    const toZ = to.properties.rotation.z || 0;
    interpolated.properties.rotation = {
      x: (from.properties.rotation.x || 0) + ((to.properties.rotation.x || 0) - (from.properties.rotation.x || 0)) * progress,
      y: (from.properties.rotation.y || 0) + ((to.properties.rotation.y || 0) - (from.properties.rotation.y || 0)) * progress,
      z: fromZ + (toZ - fromZ) * progress
    };
  }
  
  // Interpolate opacity
  if (from.properties.opacity !== undefined && to.properties.opacity !== undefined) {
    interpolated.properties.opacity = from.properties.opacity + (to.properties.opacity - from.properties.opacity) * progress;
  }
  
  return interpolated;
}

function applyEasing(progress: number, easing: string): number {
  switch (easing) {
    case 'easeIn':
      return progress * progress;
    case 'easeOut':
      return progress * (2 - progress);
    case 'easeInOut':
      return progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;
    case 'spring':
      // Simple spring approximation
      return 1 - Math.pow(1 - progress, 3);
    case 'linear':
    default:
      return progress;
  }
}

function calculateEffectStyle(effect: Effect, currentTime: number): React.CSSProperties {
  const style: React.CSSProperties = {};
  
  const effectProgress = (currentTime - effect.startTime) / effect.duration;
  const clampedProgress = Math.max(0, Math.min(1, effectProgress));
  
  switch (effect.type) {
    case 'fade':
      if (effect.parameters.type === 'in') {
        style.opacity = clampedProgress;
      } else if (effect.parameters.type === 'out') {
        style.opacity = 1 - clampedProgress;
      }
      break;
      
    case 'blur':
      style.filter = `blur(${effect.parameters.intensity || 5}px)`;
      break;
      
    case 'opacity':
      const opacityValue = effect.parameters.opacity;
      if (typeof opacityValue === 'number') {
        style.opacity = opacityValue;
      }
      break;
      
    case 'colorGrade':
      // Simplified color grading - in a real implementation, you'd use CSS filters or canvas
      if (effect.parameters.temperature) {
        const temperature = effect.parameters.temperature as number;
        style.filter = `sepia(${Math.abs(temperature) * 0.3}) hue-rotate(${temperature * 45}deg)`;
      }
      break;
      
    case 'filmGrain':
      // For film grain, you'd typically use a background image or canvas
      style.backgroundImage = 'url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48ZmlsdGVyIGlkPSJub2lzZSI+PGZlVHVyYnVsZW5jZSBiYXNlRnJlcXVlbmN5PSIwLjkiIG51bU9jdGF2ZXM9IjMiIHJlc29sYXRpb249IjAuNSIvPjwvZmlsdGVyPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsdGVyPSJ1cmwoI25vaXNlKSIgb3BhY2l0eT0iMC4zIi8+PC9zdmc+)';
      style.backgroundSize = '100px 100px';
      break;
  }
  
  return style;
}

// Utility function to dynamically import and execute the generated component
export async function executeRemotionComposition(
  composition: RemotionComposition, 
  inputProps: any
): Promise<any> {
  // In a real implementation, this would:
  // 1. Use Remotion's render API to render the composition
  // 2. Pass the generated component and props
  // 3. Return the rendered result
  
  console.log('Executing Remotion composition:', composition.compositionId);
  console.log('Composition metadata:', composition.metadata);
  
  // For now, return the component so it can be used in Remotion's rendering pipeline
  return {
    component: composition.component,
    props: inputProps,
    metadata: composition.metadata
  };
}