import fs from 'fs';
import path from 'path';
import { RemotionComposition } from './coder';

// Enhanced logging utility
const logger = {
  info: (message: string, data?: any) => {
    console.log(`[${new Date().toISOString()}] [RENDERER-INFO] ${message}`, data || '');
  },
  error: (message: string, error?: any, data?: any) => {
    console.error(`[${new Date().toISOString()}] [RENDERER-ERROR] ${message}`, error, data || '');
  },
  warn: (message: string, data?: any) => {
    console.warn(`[${new Date().toISOString()}] [RENDERER-WARN] ${message}`, data || '');
  },
  debug: (message: string, data?: any) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`[${new Date().toISOString()}] [RENDERER-DEBUG] ${message}`, data || '');
    }
  }
};

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
  const renderId = Math.random().toString(36).substr(2, 9);
  const startTime = Date.now();
  
  logger.info(`🎥 [${renderId}] Starting Remotion video rendering`);
  logger.info(`📋 [${renderId}] Render configuration:`, {
    compositionId: composition.compositionId,
    imagePath,
    outputFormat: config.outputFormat || 'mp4',
    codec: config.codec || 'h264'
  });

  try {
    const tempDir = path.join(__dirname, '../temp');
    const outputDir = path.join(__dirname, '../output');
    
    // Ensure directories exist
    if (!fs.existsSync(tempDir)) {
      logger.info(`📁 [${renderId}] Creating temp directory: ${tempDir}`);
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    if (!fs.existsSync(outputDir)) {
      logger.info(`📁 [${renderId}] Creating output directory: ${outputDir}`);
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Verify directory permissions
    try {
      fs.accessSync(tempDir, fs.constants.R_OK | fs.constants.W_OK);
      fs.accessSync(outputDir, fs.constants.R_OK | fs.constants.W_OK);
      logger.info(`✅ [${renderId}] Directory permissions verified`);
    } catch (error) {
      throw new Error(`Directory permission error: ${error}`);
    }

    const timestamp = Date.now();
    const videoPath = path.join(outputDir, `output-${timestamp}.mp4`);
    
    logger.info(`🎬 [${renderId}] Render setup completed`, {
      videoPath,
      tempDir,
      outputDir,
      compositionMetadata: composition.metadata
    });
    
    // Validate image path if provided
    if (imagePath) {
      if (!fs.existsSync(imagePath)) {
        throw new Error(`Image file not found: ${imagePath}`);
      }
      const imageStats = fs.statSync(imagePath);
      logger.info(`🖼️ [${renderId}] Image validation passed`, {
        imagePath,
        size: imageStats.size,
        exists: fs.existsSync(imagePath)
      });
    } else {
      logger.warn(`⚠️ [${renderId}] No image path provided for composition`);
    }
    
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

    logger.info(`⚙️ [${renderId}] Final render config:`, renderConfig);

    // Use Remotion CLI approach for rendering with enhanced error handling
    logger.info(`🚀 [${renderId}] Starting Remotion CLI rendering process...`);
    const finalOutputPath = await renderWithCLI(composition, imagePath, videoPath, renderId);

    // Enhanced verification of output
    if (!fs.existsSync(finalOutputPath)) {
      throw new Error(`Remotion rendering completed but output file was not created at: ${finalOutputPath}`);
    }

    const stats = fs.statSync(finalOutputPath);
    if (stats.size === 0) {
      throw new Error(`Remotion rendering created an empty file (0 bytes): ${finalOutputPath}`);
    }

    const metadata = {
      duration: composition.metadata.duration,
      width: composition.metadata.width,
      height: composition.metadata.height,
      fps: composition.metadata.fps,
      fileSize: stats.size
    };

    const processingTime = Date.now() - startTime;
    
    logger.info(`🎉 [${renderId}] Video rendering completed successfully`, {
      outputPath: finalOutputPath,
      fileSize: stats.size,
      processingTime: `${processingTime}ms`,
      metadata
    });

    return finalOutputPath;
    
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error(`💥 [${renderId}] Error in Remotion video rendering after ${processingTime}ms`, error);
    
    // Provide detailed error information
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        throw new Error(`Remotion rendering timeout after ${config.timeout || 300000}ms: ${error.message}`);
      } else if (error.message.includes('ENOENT')) {
        throw new Error(`Required file not found during Remotion rendering: ${error.message}`);
      } else if (error.message.includes('empty file')) {
        throw new Error(`Remotion rendering created empty file: ${error.message}`);
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
  outputPath?: string,
  renderId?: string
): Promise<string> {
  const tempRenderId = renderId || Math.random().toString(36).substr(2, 9);
  
  try {
    const finalOutputPath = outputPath || path.join(__dirname, '../output', `cli-output-${Date.now()}.mp4`);
    
    logger.info(`🎬 [${tempRenderId}] Starting Remotion CLI rendering`);
    
    // Create a temporary composition file for CLI rendering
    logger.info(`📝 [${tempRenderId}] Creating temporary composition file...`);
    const tempCompositionPath = await createTemporaryCompositionFile(composition, imagePath, tempRenderId);
    
    // Verify temp composition file was created
    if (!fs.existsSync(tempCompositionPath)) {
      throw new Error(`Failed to create temporary composition file: ${tempCompositionPath}`);
    }
    
    const compositionStats = fs.statSync(tempCompositionPath);
    logger.info(`✅ [${tempRenderId}] Temporary composition file created`, {
      tempCompositionPath,
      size: compositionStats.size
    });
    
    // Use Remotion's CLI API to render with enhanced error handling
    const { spawn } = require('child_process');
    
    return new Promise((resolve, reject) => {
      const remotionArgs = [
        'render',
        tempCompositionPath,
        composition.compositionId,
        finalOutputPath,
        '--codec=h264',
        '--crf=18',
        '--concurrency=4',
        '--overwrite'
      ];
      
      logger.info(`🔧 [${tempRenderId}] Executing Remotion command:`, {
        command: 'npx remotion',
        args: remotionArgs,
        outputPath: finalOutputPath
      });
      
      const renderProcess = spawn('npx', ['remotion', ...remotionArgs], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { 
          ...process.env, 
          NODE_ENV: process.env.NODE_ENV || 'production',
          REMOTION_LOG_LEVEL: 'info'
        }
      });
      
      // Capture stdout and stderr for debugging
      let stdout = '';
      let stderr = '';
      
      renderProcess.stdout?.on('data', (data: Buffer) => {
        const output = data.toString();
        stdout += output;
        logger.debug(`[${tempRenderId}] Remotion stdout:`, output.trim());
      });
      
      renderProcess.stderr?.on('data', (data: Buffer) => {
        const output = data.toString();
        stderr += output;
        logger.debug(`[${tempRenderId}] Remotion stderr:`, output.trim());
      });
      
      renderProcess.on('close', (code: number) => {
        logger.info(`🔚 [${tempRenderId}] Remotion process closed with code: ${code}`);
        
        if (code === 0) {
          // Verify output file was created and has content
          if (!fs.existsSync(finalOutputPath)) {
            reject(new Error(`Remotion process succeeded but output file not found: ${finalOutputPath}`));
            return;
          }
          
          const fileStats = fs.statSync(finalOutputPath);
          if (fileStats.size === 0) {
            reject(new Error(`Remotion process succeeded but created empty file: ${finalOutputPath}`));
            return;
          }
          
          logger.info(`✅ [${tempRenderId}] Remotion CLI rendering completed successfully`, {
            outputPath: finalOutputPath,
            fileSize: fileStats.size,
            stdoutLength: stdout.length,
            stderrLength: stderr.length
          });
          
          resolve(finalOutputPath);
        } else {
          logger.error(`❌ [${tempRenderId}] Remotion CLI rendering failed with exit code ${code}`);
          logger.error(`[${tempRenderId}] Full stdout:`, stdout);
          logger.error(`[${tempRenderId}] Full stderr:`, stderr);
          reject(new Error(`Remotion CLI rendering failed with exit code ${code}. stderr: ${stderr}`));
        }
      });
      
      renderProcess.on('error', (error: Error) => {
        logger.error(`💥 [${tempRenderId}] Remotion CLI rendering process error:`, error);
        reject(new Error(`Remotion CLI rendering process error: ${error.message}`));
      });
      
      // Add timeout handling
      const timeout = setTimeout(() => {
        renderProcess.kill('SIGTERM');
        logger.warn(`⏰ [${tempRenderId}] Remotion rendering timed out after 5 minutes`);
        reject(new Error('Remotion rendering timed out after 5 minutes'));
      }, 300000);
      
      renderProcess.on('close', () => {
        clearTimeout(timeout);
      });
    });
    
  } catch (error) {
    logger.error(`💥 [${tempRenderId}] Error in Remotion CLI rendering:`, error);
    throw new Error(`Remotion CLI rendering failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Utility function to create a temporary Remotion composition file
async function createTemporaryCompositionFile(
  composition: RemotionComposition,
  imagePath?: string,
  renderId?: string
): Promise<string> {
  const tempDir = path.join(__dirname, '../temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  const compositionFilePath = path.join(tempDir, `temp-composition-${Date.now()}-${renderId || 'unknown'}.tsx`);
  
  // Copy image to temp directory if provided
  let tempImagePath: string | undefined;
  if (imagePath && fs.existsSync(imagePath)) {
    const imageExtension = path.extname(imagePath);
    tempImagePath = path.join(tempDir, `temp-image-${Date.now()}-${renderId || 'unknown'}${imageExtension}`);
    fs.copyFileSync(imagePath, tempImagePath);
    logger.info(`📁 [${renderId}] Image copied to temp directory:`, tempImagePath);
  }
  
  // Generate TypeScript composition file with enhanced error handling
  const compositionCode = generateCompositionFile(composition, tempImagePath);
  
  try {
    fs.writeFileSync(compositionFilePath, compositionCode);
    logger.info(`📄 [${renderId}] Composition file written successfully:`, compositionFilePath);
    return compositionFilePath;
  } catch (error) {
    logger.error(`💥 [${renderId}] Failed to write composition file:`, error);
    throw new Error(`Failed to write composition file: ${error}`);
  }
}

// Generate the actual TypeScript/TSX composition file with fixes for black screen
function generateCompositionFile(
  composition: RemotionComposition,
  tempImagePath?: string
): string {
  const compositionId = composition.compositionId.replace(/-/g, '_');
  const duration = composition.metadata.duration * composition.metadata.fps;
  
  // Get just the filename for the image reference
  const imageFilename = tempImagePath ? path.basename(tempImagePath) : null;
  
  logger.debug('🎨 Generating composition file with parameters:', {
    compositionId,
    duration,
    width: composition.metadata.width,
    height: composition.metadata.height,
    fps: composition.metadata.fps,
    tempImagePath,
    imageFilename
  });
  
  return `import React from 'react';
import { Composition, interpolate, spring, useCurrentFrame, Img, registerRoot } from 'remotion';

// Dynamic composition component generated from Motion-IR
export const ${compositionId}: React.FC<{ imageSrc?: string }> = ({ imageSrc }) => {
  const frame = useCurrentFrame();
  const duration = ${duration}; // frames
  const fps = ${composition.metadata.fps};
  
  // Enhanced fade in animation with longer duration for visibility
  const opacity = interpolate(
    frame,
    [0, Math.min(60, duration * 0.1)], 
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  // Smooth scale animation using spring for more natural feel
  const scale = spring({
    frame,
    fps: fps,
    config: {
      damping: 15,
      stiffness: 100,
    },
  });
  
  // Add pan animation (left to right)
  const translateX = interpolate(
    frame,
    [0, duration * 0.8],
    [0, 100],
    { extrapolateRight: 'clamp' }
  );
  
  // Add subtle zoom in effect
  const zoomScale = interpolate(
    frame,
    [0, duration * 0.7],
    [1, 1.1],
    { extrapolateRight: 'clamp' }
  );
  
  // Cursor animation from bottom to top
  const cursorY = interpolate(
    frame,
    [0, duration],
    [${composition.metadata.height + 50}, -50],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  // Log current frame for debugging (only in development)
  ${process.env.NODE_ENV !== 'production' ? `console.log('Frame:', frame, 'Opacity:', opacity, 'Scale:', scale, 'TranslateX:', translateX);` : ''}
  
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: '#000000',
        position: 'relative',
        overflow: 'hidden',
        opacity,
        transform: \`scale(\${scale * zoomScale}) translateX(\${translateX}px)\`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      ${imageFilename ? `
        <Img
          src={\`http://localhost:3001/temp/${imageFilename}\`}
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
            console.error('Failed to load image:', '${imageFilename}');
            e.currentTarget.style.display = 'none';
          }}
          onLoad={() => {
            console.log('Image loaded successfully:', '${imageFilename}');
          }}
        />
        
        {/* Animated cursor effect */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: cursorY,
            width: '20px',
            height: '20px',
            backgroundColor: '#00ff88',
            borderRadius: '50%',
            transform: 'translate(-50%, -50%)',
            boxShadow: '0 0 20px rgba(0, 255, 136, 0.6)',
            animation: \`pulse 1.5s ease-in-out infinite alternate\`,
          }}
        />
        
        <style>
          {\`
            @keyframes pulse {
              0% { transform: translate(-50%, -50%) scale(1); opacity: 0.8; }
              100% { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
            }
          \`}
        </style>
      ` : `
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
      `}
    </div>
  );
};

// Main composition wrapper
export const RemotionVideo: React.FC = () => {
  return (
    <Composition
      id="${composition.compositionId}"
      component={${compositionId}}
      durationInFrames={${duration}}
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
  try {
    // Extract just the filename from the path
    const filename = path.basename(videoPath);
    const urlPath = `/api/videos/${filename}`;
    
    logger.debug('🔗 Generated video URL:', { 
      videoPath, 
      filename, 
      finalUrl: urlPath 
    });
    
    return urlPath;
  } catch (error) {
    logger.error('💥 Error generating video URL:', error);
    throw new Error(`Failed to generate video URL: ${error}`);
  }
}

// Health check function for Remotion installation
export async function checkRemotionHealth(): Promise<boolean> {
  try {
    logger.info('🏥 Checking Remotion health...');
    
    // Check if Remotion is installed by trying to import it
    const {Composition} = await import('remotion');
    logger.info('✅ Remotion is properly installed and configured');
    return true;
  } catch (error) {
    logger.error('💥 Remotion health check failed:', error);
    return false;
  }
}

// Fallback rendering method using a simpler approach
export async function renderWithFallback(
  composition: RemotionComposition,
  imagePath?: string,
  renderId?: string
): Promise<string> {
  const tempRenderId = renderId || Math.random().toString(36).substr(2, 9);
  
  try {
    const outputDir = path.join(__dirname, '../output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const videoPath = path.join(outputDir, `fallback-output-${Date.now()}-${tempRenderId}.mp4`);
    
    logger.info(`🔄 [${tempRenderId}] Using fallback Remotion rendering method...`);
    
    // Create a simple composition and render it
    const tempCompositionPath = await createSimpleComposition(composition, imagePath, tempRenderId);
    
    // Run Remotion render command
    const { spawn } = require('child_process');
    
    return new Promise((resolve, reject) => {
      const args = [
        'render',
        tempCompositionPath,
        composition.compositionId,
        videoPath,
        '--codec=h264',
        '--overwrite'
      ];
      
      logger.info(`🔧 [${tempRenderId}] Fallback Remotion command:`, {
        command: 'npx remotion',
        args: args
      });
      
      const renderProcess = spawn('npx', ['remotion', ...args], {
        stdio: 'inherit',
        env: { ...process.env, NODE_ENV: process.env.NODE_ENV || 'production' }
      });
      
      renderProcess.on('close', (code: number) => {
        if (code === 0) {
          logger.info(`✅ [${tempRenderId}] Fallback rendering completed: ${videoPath}`);
          resolve(videoPath);
        } else {
          logger.error(`❌ [${tempRenderId}] Fallback Remotion rendering failed with exit code ${code}`);
          reject(new Error(`Fallback Remotion rendering failed with exit code ${code}`));
        }
      });
      
      renderProcess.on('error', (error: Error) => {
        logger.error(`💥 [${tempRenderId}] Fallback rendering process error:`, error);
        reject(new Error(`Fallback rendering process error: ${error.message}`));
      });
    });
    
  } catch (error) {
    logger.error(`💥 [${tempRenderId}] Fallback rendering failed:`, error);
    throw error;
  }
}

async function createSimpleComposition(
  composition: RemotionComposition,
  imagePath?: string,
  renderId?: string
): Promise<string> {
  const tempDir = path.join(__dirname, '../temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  const compositionFilePath = path.join(tempDir, `simple-composition-${Date.now()}-${renderId || 'unknown'}.tsx`);
  
  // Copy image to temp directory if provided
  let tempImagePath: string | undefined;
  if (imagePath && fs.existsSync(imagePath)) {
    const imageExtension = path.extname(imagePath);
    tempImagePath = path.join(tempDir, `simple-image-${Date.now()}-${renderId || 'unknown'}${imageExtension}`);
    fs.copyFileSync(imagePath, tempImagePath);
    logger.info(`📁 [${renderId}] Simple composition image copied:`, tempImagePath);
  }
  
  const imageFilename = tempImagePath ? path.basename(tempImagePath) : null;
  
  const compositionCode = `import React from 'react';
import { Composition, interpolate, useCurrentFrame, Img, registerRoot } from 'remotion';

export const SimpleVideo: React.FC<{ imageSrc?: string }> = ({ imageSrc }) => {
  const frame = useCurrentFrame();
  const duration = 150; // 5 seconds at 30fps
  
  // Basic fade in animation
  const opacity = interpolate(frame, [0, 30], [0, 1]);
  
  // Subtle scale animation
  const scale = interpolate(frame, [0, duration * 0.7], [0.95, 1.05], { extrapolateRight: 'clamp' });
  
  // Horizontal pan
  const translateX = interpolate(frame, [0, duration * 0.8], [0, 50]);
  
  console.log('Simple composition frame:', frame, 'opacity:', opacity, 'scale:', scale);
  
  return (
    <div style={{ 
      width: '100%', 
      height: '100%', 
      backgroundColor: '#000', 
      opacity,
      transform: \`scale(\${scale}) translateX(\${translateX}px)\`,
      position: 'relative',
      overflow: 'hidden'
    }}>
      ${imageFilename ? `
        <Img 
          src={\`http://localhost:3001/temp/${imageFilename}\`}
          style={{ 
            width: '100%', 
            height: '100%', 
            objectFit: 'cover',
            position: 'absolute',
            top: 0,
            left: 0,
          }}
          onError={(e: any) => console.error('Image load error:', '${imageFilename}')}
          onLoad={() => console.log('Image loaded:', '${imageFilename}')}
        />
        
        {/* Simple cursor animation */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: \`\${(frame / duration) * 100}%\`,
            width: '15px',
            height: '15px',
            backgroundColor: '#ff6b6b',
            borderRadius: '50%',
            transform: 'translate(-50%, -50%)',
            boxShadow: '0 0 15px rgba(255, 107, 107, 0.5)',
          }}
        />
      ` : `
        <div style={{ 
          width: '100%', 
          height: '100%', 
          backgroundColor: '#333', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          color: 'white',
          fontSize: '24px'
        }}>
          No Image
        </div>
      `}
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
  logger.info(`📄 [${renderId}] Simple composition file created:`, compositionFilePath);
  return compositionFilePath;
}