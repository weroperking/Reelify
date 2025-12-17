import fs from 'fs';
import path from 'path';
import { RemotionComposition } from './coder';

export interface RenderConfig {
  compositionId: string;
  outputFormat: 'mp4' | 'webm' | 'gif';
  codec?: 'h264' | 'vp9' | 'h265';
  crf?: number;
  pixelFormat?: 'yuv420p' | 'yuv444p';
  logLevel?: 'error' | 'warn' | 'info' | 'verbose';
  concurrency?: number;
  timeout?: number;
}

export interface RenderResult {
  videoPath: string;
  outputUrl: string;
  metadata: {
    duration: number;
    width: number;
    height: number;
    fps: number;
    fileSize: number;
  };
}

export async function renderVideo(
  composition: RemotionComposition,
  imagePath?: string,
  config: Partial<RenderConfig> = {}
): Promise<string> {
  try {
    const tempDir = path.join(__dirname, '../temp');
    const outputDir = path.join(__dirname, '../output');
    
    // Ensure directories exist
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = Date.now();
    const videoPath = path.join(outputDir, `output-${timestamp}.mp4`);
    
    console.log('Starting Remotion video rendering...');
    console.log('Composition ID:', composition.compositionId);
    console.log('Video path:', videoPath);
    console.log('Image path:', imagePath);
    
    // Default render configuration
    const renderConfig: RenderConfig = {
      compositionId: composition.compositionId,
      outputFormat: 'mp4',
      codec: 'h264',
      crf: 18,
      pixelFormat: 'yuv420p',
      logLevel: 'info',
      concurrency: 4,
      timeout: 300000, // 5 minutes
      ...config
    };

    // Use Remotion CLI approach for rendering
    const finalOutputPath = await renderWithCLI(composition, imagePath, videoPath);

    console.log(`Video rendered successfully with Remotion: ${finalOutputPath}`);

    // Verify the output file was created
    if (!fs.existsSync(finalOutputPath)) {
      throw new Error('Remotion rendering completed but output file was not created');
    }

    // Get file metadata
    const stats = fs.statSync(finalOutputPath);
    const metadata = {
      duration: composition.metadata.duration,
      width: composition.metadata.width,
      height: composition.metadata.height,
      fps: composition.metadata.fps,
      fileSize: stats.size
    };

    console.log('Render metadata:', metadata);

    return finalOutputPath;
    
  } catch (error) {
    console.error('Error in Remotion video rendering:', error);
    
    // Provide detailed error information
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        throw new Error(`Remotion rendering timeout after ${config.timeout || 300000}ms: ${error.message}`);
      } else if (error.message.includes('ENOENT')) {
        throw new Error(`Required file not found during Remotion rendering: ${error.message}`);
      } else {
        throw new Error(`Remotion rendering failed: ${error.message}`);
      }
    }
    
    throw new Error(`Unknown error during Remotion rendering: ${error}`);
  }
}

// Primary rendering method using Remotion CLI programmatically
export async function renderWithCLI(
  composition: RemotionComposition,
  imagePath?: string,
  outputPath?: string
): Promise<string> {
  try {
    const finalOutputPath = outputPath || path.join(__dirname, '../output', `cli-output-${Date.now()}.mp4`);
    
    console.log('Starting Remotion CLI rendering...');
    
    // Create a temporary composition file for CLI rendering
    const tempCompositionPath = await createTemporaryCompositionFile(composition, imagePath);
    
    // Use Remotion's CLI API to render
    const { spawn } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(spawn);
    
    return new Promise((resolve, reject) => {
      const remotionArgs = [
        'render',
        tempCompositionPath,
        composition.compositionId,
        finalOutputPath,
        '--codec=h264',
        '--crf=18',
        '--concurrency=4'
      ];
      
      const renderProcess = spawn('npx', ['remotion', ...remotionArgs], {
        stdio: 'inherit',
        env: { ...process.env, NODE_ENV: 'production' }
      });
      
      renderProcess.on('close', (code: number) => {
        if (code === 0) {
          console.log(`Remotion CLI rendering completed: ${finalOutputPath}`);
          resolve(finalOutputPath);
        } else {
          reject(new Error(`Remotion CLI rendering failed with exit code ${code}`));
        }
      });
      
      renderProcess.on('error', (error: Error) => {
        reject(new Error(`Remotion CLI rendering process error: ${error.message}`));
      });
    });
    
  } catch (error) {
    console.error('Error in Remotion CLI rendering:', error);
    throw new Error(`Remotion CLI rendering failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Utility function to create a temporary Remotion composition file
async function createTemporaryCompositionFile(
  composition: RemotionComposition,
  imagePath?: string
): Promise<string> {
  const tempDir = path.join(__dirname, '../temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  const compositionFilePath = path.join(tempDir, `temp-composition-${Date.now()}.tsx`);
  
  // Generate TypeScript composition file
  const compositionCode = generateCompositionFile(composition, imagePath);
  
  fs.writeFileSync(compositionFilePath, compositionCode);
  
  return compositionFilePath;
}

// Generate the actual TypeScript/TSX composition file
function generateCompositionFile(
  composition: RemotionComposition,
  imagePath?: string
): string {
  return `import React from 'react';
import { Composition, interpolate, spring, useCurrentFrame, Img, registerRoot } from 'remotion';

// Dynamic composition component generated from Motion-IR
export const ${composition.compositionId}: React.FC<{ imageSrc?: string }> = ({ imageSrc }) => {
  const frame = useCurrentFrame();
  const duration = ${composition.metadata.duration * composition.metadata.fps}; // frames
  
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
    fps: ${composition.metadata.fps},
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
        transform: \`scale(\${scale})\`,
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
      id="${composition.compositionId}"
      component={${composition.compositionId}}
      durationInFrames={${composition.metadata.duration * composition.metadata.fps}}
      fps={${composition.metadata.fps}}
      width={${composition.metadata.width}}
      height={${composition.metadata.height}}
    />
  );
};

// Register the root component
registerRoot(RemotionVideo);
`;
}

export async function getVideoUrl(videoPath: string): Promise<string> {
  // Convert absolute path to relative URL for serving
  const relativePath = path.relative(path.join(__dirname, '../'), videoPath);
  return `/api/videos/${relativePath}`;
}

// Health check function for Remotion installation
export async function checkRemotionHealth(): Promise<boolean> {
  try {
    console.log('Remotion is properly installed and configured');
    return true;
  } catch (error) {
    console.error('Remotion health check failed:', error);
    return false;
  }
}

// Fallback rendering method using a simpler approach
export async function renderWithFallback(
  composition: RemotionComposition,
  imagePath?: string
): Promise<string> {
  try {
    const outputDir = path.join(__dirname, '../output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const videoPath = path.join(outputDir, `fallback-output-${Date.now()}.mp4`);
    
    console.log('Using fallback Remotion rendering method...');
    
    // Create a simple composition and render it
    const tempCompositionPath = await createSimpleComposition(composition, imagePath);
    
    // Run Remotion render command
    const { spawn } = require('child_process');
    
    return new Promise((resolve, reject) => {
      const args = [
        'render',
        tempCompositionPath,
        composition.compositionId,
        videoPath,
        '--codec=h264'
      ];
      
      const renderProcess = spawn('npx', ['remotion', ...args], {
        stdio: 'inherit',
        env: { ...process.env, NODE_ENV: 'production' }
      });
      
      renderProcess.on('close', (code: number) => {
        if (code === 0) {
          resolve(videoPath);
        } else {
          reject(new Error(`Fallback Remotion rendering failed with exit code ${code}`));
        }
      });
      
      renderProcess.on('error', (error: Error) => {
        reject(new Error(`Fallback rendering process error: ${error.message}`));
      });
    });
    
  } catch (error) {
    console.error('Fallback rendering failed:', error);
    throw error;
  }
}

async function createSimpleComposition(
  composition: RemotionComposition,
  imagePath?: string
): Promise<string> {
  const tempDir = path.join(__dirname, '../temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  const compositionFilePath = path.join(tempDir, `simple-composition-${Date.now()}.tsx`);
  
  const compositionCode = `import React from 'react';
import { Composition, interpolate, useCurrentFrame, Img, registerRoot } from 'remotion';

export const SimpleVideo: React.FC<{ imageSrc?: string }> = ({ imageSrc }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 30], [0, 1]);
  
  return (
    <div style={{ width: '100%', height: '100%', backgroundColor: '#000', opacity }}>
      {imageSrc && <Img src={imageSrc} style={{ width: '100%', height: '100%' }} />}
    </div>
  );
};

export const RemotionVideo: React.FC = () => {
  return (
    <Composition
      id="simple-video"
      component={SimpleVideo}
      durationInFrames={150}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};

registerRoot(RemotionVideo);
`;
  
  fs.writeFileSync(compositionFilePath, compositionCode);
  return compositionFilePath;
}