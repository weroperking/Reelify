
import React from 'react';
import { Composition } from 'remotion';
import MyComposition from './Composition';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="my-comp"
        component={MyComposition}
        durationInFrames={150} // 5 seconds at 30fps
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          imageUrl: '',
        }}
      />
    </>
  );
};

export default RemotionRoot;
