import React from 'react';
import { Composition, interpolate, spring, useCurrentFrame, Img, registerRoot } from 'remotion';

// Dynamic composition component generated from Motion-IR
export const dynamic-composition: React.FC<{ imageSrc?: string }> = ({ imageSrc }) => {
  const frame = useCurrentFrame();
  const duration = 150; // frames
  
  // Basic fade in animation
  const opacity = interpolate(
    frame,
    [0, 30],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  // Scale animation
  const scale = spring({
    frame,
    fps: 30,
    config: {
      damping: 15,
      stiffness: 100,
    },
  });
  
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
      }}
    >
      {imageSrc && (
        <Img
          src={imageSrc}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      )}
    </div>
  );
};

// Main composition wrapper
export const RemotionVideo: React.FC = () => {
  return (
    <Composition
      id="dynamic-composition"
      component={dynamic-composition}
      durationInFrames={150}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};

// Register the root component
registerRoot(RemotionVideo);
