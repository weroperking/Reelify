
import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig, Img } from 'remotion';

const MyComposition: React.FC<{ imageUrl?: string }> = ({ imageUrl }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();

  // Simple animation - fade in and slight zoom
  const opacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const scale = interpolate(frame, [0, 60], [0.8, 1.1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div style={{
      width: '100%',
      height: '100%',
      backgroundColor: '#000',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Arial, sans-serif',
    }}>
      {imageUrl ? (
        <div style={{
          transform: `scale(${scale})`,
          opacity: opacity,
          width: '80%',
          height: '80%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Img 
            src={imageUrl} 
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              borderRadius: '10px',
            }}
          />
        </div>
      ) : (
        <div style={{
          color: 'white',
          fontSize: '48px',
          fontWeight: 'bold',
          opacity: opacity,
        }}>
          Loading...
        </div>
      )}
    </div>
  );
};

export default MyComposition;
