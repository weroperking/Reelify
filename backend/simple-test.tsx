import React from 'react';
import { Composition, interpolate, useCurrentFrame, registerRoot } from 'remotion';

export const SimpleTest: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 30], [0, 1]);
  
  return (
    <div style={{ 
      width: '100%', 
      height: '100%', 
      backgroundColor: '#000', 
      opacity,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontSize: '48px'
    }}>
      Simple Test Video
    </div>
  );
};

export const RemotionVideo: React.FC = () => {
  return (
    <Composition
      id="simple-test"
      component={SimpleTest}
      durationInFrames={150}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};

registerRoot(RemotionVideo);