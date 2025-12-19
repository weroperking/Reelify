import React from 'react';
import { Composition, interpolate, spring, useCurrentFrame, Img, registerRoot } from 'remotion';

// Dynamic composition component generated from Motion-IR
export const dynamic_composition: React.FC<{ imageSrc?: string }> = ({ imageSrc }) => {
  const frame = useCurrentFrame();
  const duration = 150; // frames
  
  // Enhanced fade in animation with longer duration for visibility
  const opacity = interpolate(
    frame,
    [0, 60], // Increased from 30 to 60 frames (2 seconds at 30fps)
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  // Smooth scale animation
  const scale = spring({
    frame,
    fps: 30,
    config: {
      damping: 15,
      stiffness: 100,
    },
  });
  
  // Log current frame for debugging (only in development)
  console.log('Frame:', frame, 'Opacity:', opacity, 'Scale:', scale);
  
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: '#000000',
        position: 'relative',
        overflow: 'hidden',
        opacity,
        transform: `scale(${scale})`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {imageSrc && (
        <Img
          src={imageSrc}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            position: 'absolute',
            top: 0,
            left: 0,
          }}
          // Add error handling for image loading
          onError={(e) => {
            console.error('Failed to load image:', imageSrc);
            e.currentTarget.style.display = 'none';
          }}
          onLoad={() => {
            console.log('Image loaded successfully:', imageSrc);
          }}
        />
      )}
      {/* Fallback content if no image */}
      {!imageSrc && (
        <div
          style={{
            width: '100%',
            height: '100%',
            backgroundColor: '#1a1a1a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontSize: '24px',
          }}
        >
          No Image Available
        </div>
      )}
    </div>
  );
};

// Main composition wrapper
export const RemotionVideo: React.FC = () => {
  return (
    <Composition
      id="dynamic-composition"
      component={dynamic_composition}
      durationInFrames={150}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};

// Register the root component
registerRoot(RemotionVideo);
