import { mapper, Schema, validateSchema } from './mapper';
import { director, MotionIR } from './director';
import { coder, RemotionComposition } from './coder';
import { renderVideo, RenderConfig } from './renderer';
import { validateMotionIR } from './schema';

export interface PipelineResult {
  videoPath: string;
  videoUrl: string;
  metadata: {
    duration: number;
    width: number;
    height: number;
    fps: number;
    fileSize: number;
  };
  motionIR: MotionIR;
  processingTime: number;
}

export interface PipelineConfig {
  enableValidation: boolean;
  enableFallbacks: boolean;
  maxRetries: number;
  timeout: number;
  renderConfig: Partial<RenderConfig>;
}

const DEFAULT_CONFIG: PipelineConfig = {
  enableValidation: true,
  enableFallbacks: true,
  maxRetries: 3,
  timeout: 300000, // 5 minutes
  renderConfig: {
    codec: 'h264',
    crf: 18,
    pixelFormat: 'yuv420p',
    concurrency: 4
  }
};

export async function generateVideo(
  imagePath: string, 
  prompt: string, 
  config: Partial<PipelineConfig> = {}
): Promise<PipelineResult> {
  const startTime = Date.now();
  const pipelineConfig = { ...DEFAULT_CONFIG, ...config };
  
  console.log('🎬 Starting AI-driven Remotion pipeline...');
  console.log('📋 Configuration:', pipelineConfig);
  
  try {
    // Step 1: Mapper - Analyze image to get comprehensive schema
    console.log('🔍 Step 1: Image Analysis (Mapper)');
    const schema = await executeWithRetry<Schema>(
      () => mapper(imagePath),
      'Image analysis failed',
      pipelineConfig
    );
    
    // Validate schema output
    if (pipelineConfig.enableValidation) {
      const schemaValidation = validateSchema(schema);
      if (!schemaValidation.isValid) {
        throw new Error(`Schema validation failed: ${schemaValidation.errors.join(', ')}`);
      }
    }
    
    console.log('✅ Image analysis completed');
    console.log('📊 Schema:', JSON.stringify(schema, null, 2));
    
    // Step 2: Director - Transform schema and prompt to Motion-IR
    console.log('🎭 Step 2: Creative Direction (Director)');
    const motionIR = await executeWithRetry<MotionIR>(
      () => Promise.resolve(director(schema, prompt, imagePath)),
      'Motion-IR generation failed',
      pipelineConfig
    );
    
    // Validate Motion-IR
    if (pipelineConfig.enableValidation) {
      const motionIRValidation = motionIR.validation;
      if (!motionIRValidation.isValid) {
        throw new Error(`Motion-IR validation failed: ${motionIRValidation.errors.join(', ')}`);
      }
    }
    
    console.log('✅ Motion-IR generation completed');
    console.log('🎬 Motion-IR metadata:', {
      duration: motionIR.timeline.metadata.duration,
      width: motionIR.timeline.metadata.width,
      height: motionIR.timeline.metadata.height,
      tracks: motionIR.timeline.tracks.length,
      assets: motionIR.timeline.assets.length
    });
    
    // Step 3: Coder - Generate executable Remotion composition
    console.log('⚙️ Step 3: Code Generation (Coder)');
    const composition = await executeWithRetry<RemotionComposition>(
      () => coder(motionIR),
      'Remotion composition generation failed',
      pipelineConfig
    );
    
    console.log('✅ Remotion composition generated');
    console.log('🖼️ Composition metadata:', composition.metadata);
    
    // Step 4: Render video using Remotion
    console.log('🎥 Step 4: Video Rendering (Renderer)');
    const videoPath = await executeWithRetry<string>(
      () => renderVideo(composition, imagePath, pipelineConfig.renderConfig),
      'Video rendering failed',
      pipelineConfig
    );
    
    console.log('✅ Video rendering completed');
    
    // Step 5: Generate URL for frontend
    const { getVideoUrl } = await import('./renderer');
    const videoUrl = await getVideoUrl(videoPath);
    
    // Get file metadata
    const fs = require('fs');
    const stats = fs.statSync(videoPath);
    
    const processingTime = Date.now() - startTime;
    
    const result: PipelineResult = {
      videoPath,
      videoUrl,
      metadata: {
        duration: composition.metadata.duration,
        width: composition.metadata.width,
        height: composition.metadata.height,
        fps: composition.metadata.fps,
        fileSize: stats.size
      },
      motionIR,
      processingTime
    };
    
    console.log('🎉 Pipeline completed successfully!');
    console.log('⏱️ Total processing time:', `${processingTime}ms`);
    console.log('📁 Video saved to:', videoPath);
    console.log('🌐 Video URL:', videoUrl);
    
    return result;
    
  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    console.error('❌ Pipeline failed after', `${processingTime}ms`);
    console.error('💥 Error details:', error);
    
    // Enhanced error reporting
    if (error instanceof Error) {
      const errorContext = categorizeError(error);
      console.error('🔍 Error category:', errorContext.category);
      console.error('📝 Error details:', errorContext.details);
      
      // Add context-specific error messages
      let enhancedErrorMessage = `Pipeline failed (${errorContext.category}): ${error.message}`;
      
      if (errorContext.category === 'image_analysis') {
        enhancedErrorMessage += '. Please check if the image file exists and is valid.';
      } else if (errorContext.category === 'motion_generation') {
        enhancedErrorMessage += '. Please check your prompt and try again.';
      } else if (errorContext.category === 'rendering') {
        enhancedErrorMessage += '. This might be a temporary issue with the rendering service.';
      }
      
      throw new Error(enhancedErrorMessage);
    }
    
    throw new Error(`Unknown pipeline error: ${error}`);
  }
}

// Helper function to execute with retry logic
async function executeWithRetry<T>(
  operation: () => Promise<T>,
  errorMessage: string,
  config: PipelineConfig,
  attempt: number = 1
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    console.error(`Attempt ${attempt} failed:`, errorMessage);
    
    if (attempt < config.maxRetries && config.enableFallbacks) {
      console.log(`Retrying operation (attempt ${attempt + 1}/${config.maxRetries})...`);
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
      return executeWithRetry(operation, errorMessage, config, attempt + 1);
    }
    
    throw error;
  }
}

// Error categorization for better debugging
interface ErrorContext {
  category: 'image_analysis' | 'motion_generation' | 'composition' | 'rendering' | 'unknown';
  details: string;
}

function categorizeError(error: Error): ErrorContext {
  const message = error.message.toLowerCase();
  
  if (message.includes('image') || message.includes('mapper') || message.includes('vision')) {
    return { category: 'image_analysis', details: 'Error occurred during image analysis' };
  } else if (message.includes('motion') || message.includes('director') || message.includes('timeline')) {
    return { category: 'motion_generation', details: 'Error occurred during Motion-IR generation' };
  } else if (message.includes('composition') || message.includes('coder') || message.includes('remotion')) {
    return { category: 'composition', details: 'Error occurred during composition generation' };
  } else if (message.includes('render') || message.includes('ffmpeg') || message.includes('video')) {
    return { category: 'rendering', details: 'Error occurred during video rendering' };
  } else {
    return { category: 'unknown', details: 'Unknown error category' };
  }
}

// Health check function for the entire pipeline
export async function checkPipelineHealth(): Promise<{
  overall: boolean;
  components: {
    mapper: boolean;
    director: boolean;
    coder: boolean;
    renderer: boolean;
  };
  errors: string[];
}> {
  const errors: string[] = [];
  const components = {
    mapper: true,
    director: true,
    coder: true,
    renderer: true
  };
  
  try {
    // Check if required modules can be imported
    await import('./mapper');
    console.log('✅ Mapper module loaded successfully');
  } catch (error) {
    components.mapper = false;
    errors.push(`Mapper module error: ${error}`);
  }
  
  try {
    await import('./director');
    console.log('✅ Director module loaded successfully');
  } catch (error) {
    components.director = false;
    errors.push(`Director module error: ${error}`);
  }
  
  try {
    await import('./coder');
    console.log('✅ Coder module loaded successfully');
  } catch (error) {
    components.coder = false;
    errors.push(`Coder module error: ${error}`);
  }
  
  try {
    await import('./renderer');
    console.log('✅ Renderer module loaded successfully');
  } catch (error) {
    components.renderer = false;
    errors.push(`Renderer module error: ${error}`);
  }
  
  const overall = Object.values(components).every(status => status);
  
  return {
    overall,
    components,
    errors
  };
}

// Utility function to get pipeline statistics
export function getPipelineStats(): {
  version: string;
  modules: string[];
  features: string[];
} {
  return {
    version: '2.0.0',
    modules: ['mapper', 'director', 'coder', 'renderer'],
    features: [
      'AI-driven image analysis',
      'Motion-IR timeline generation',
      'Executable Remotion composition',
      'Comprehensive error handling',
      'Retry logic with fallbacks',
      'Pipeline health monitoring'
    ]
  };
}