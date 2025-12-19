import { mapper, Schema, validateSchema } from './mapper';
import { director, MotionIR } from './director';
import { coder, RemotionComposition } from './coder';
import { renderVideo, RenderConfig } from './renderer';
import { validateMotionIR } from './schema';
import fs from 'fs';
import path from 'path';

// Enhanced logging utility
const logger = {
  info: (message: string, data?: any) => {
    console.log(`[${new Date().toISOString()}] [PIPELINE-INFO] ${message}`, data || '');
  },
  error: (message: string, error?: any, data?: any) => {
    console.error(`[${new Date().toISOString()}] [PIPELINE-ERROR] ${message}`, error, data || '');
  },
  warn: (message: string, data?: any) => {
    console.warn(`[${new Date().toISOString()}] [PIPELINE-WARN] ${message}`, data || '');
  },
  debug: (message: string, data?: any) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`[${new Date().toISOString()}] [PIPELINE-DEBUG] ${message}`, data || '');
    }
  },
  step: (step: string, message: string, data?: any) => {
    console.log(`[${new Date().toISOString()}] [PIPELINE-STEP-${step}] ${message}`, data || '');
  }
};

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
  const requestId = Math.random().toString(36).substr(2, 9);
  const pipelineConfig = { ...DEFAULT_CONFIG, ...config };
  
  logger.step('START', `🎬 Starting AI-driven Remotion pipeline`, { requestId, imagePath, promptLength: prompt.length });
  logger.info('📋 Configuration:', pipelineConfig);
  
  // Validate inputs
  if (!imagePath || !fs.existsSync(imagePath)) {
    throw new Error(`Invalid image path: ${imagePath}`);
  }
  
  if (!prompt || prompt.trim().length === 0) {
    throw new Error('Prompt cannot be empty');
  }
  
  // Get file information
  const imageStats = fs.statSync(imagePath);
  logger.step('START', '📊 Input validation completed', {
    imagePath,
    imageSize: imageStats.size,
    imageExists: fs.existsSync(imagePath),
    prompt: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : '')
  });
  
  try {
    // Step 1: Mapper - Analyze image to get comprehensive schema
    logger.step('MAPPER', '🔍 Step 1: Image Analysis (Mapper)');
    const schema = await executeWithRetry<Schema>(
      () => mapper(imagePath),
      'Image analysis failed',
      pipelineConfig,
      'MAPPER'
    );
    
    // Validate schema output
    if (pipelineConfig.enableValidation) {
      const schemaValidation = validateSchema(schema);
      if (!schemaValidation.isValid) {
        throw new Error(`Schema validation failed: ${schemaValidation.errors.join(', ')}`);
      }
    }
    
    logger.step('MAPPER', '✅ Image analysis completed successfully');
    logger.info('📊 Schema summary:', {
      primaryElements: schema.elements.primary.length,
      secondaryElements: schema.elements.secondary.length,
      colorCount: schema.scene.colors.length,
      emotions: schema.scene.emotion,
      complexityScore: schema.visual_analysis.complexity_score,
      contrastRatio: schema.visual_analysis.contrast_ratio,
      lighting: schema.scene.lighting,
      style: schema.composition.style
    });
    
    // Step 2: Director - Transform schema and prompt to Motion-IR
    logger.step('DIRECTOR', '🎭 Step 2: Creative Direction (Director)');
    const motionIR = await executeWithRetry<MotionIR>(
      () => Promise.resolve(director(schema, prompt, imagePath)),
      'Motion-IR generation failed',
      pipelineConfig,
      'DIRECTOR'
    );
    
    // Validate Motion-IR
    if (pipelineConfig.enableValidation) {
      const motionIRValidation = motionIR.validation;
      if (!motionIRValidation.isValid) {
        logger.warn('-IR validation warnings:', motionIRValidation.errors);
      }
    }
    
    logger.step('DIRECTOR', '✅ Motion-IR generation completed successfully');
    logger.info('🎬 Motion-IR summary:', {
      duration: motionIR.timeline.metadata.duration,
      width: motionIR.timeline.metadata.width,
      height: motionIR.timeline.metadata.height,
      tracks: motionIR.timeline.tracks.length,
      assets: motionIR.timeline.assets.length,
      effects: motionIR.timeline.globalEffects.length,
      cameraType: motionIR.timeline.camera?.type
    });
    
    // Step 3: Coder - Generate executable Remotion composition
    logger.step('CODER', '⚙️ Step 3: Code Generation (Coder)');
    const composition = await executeWithRetry<RemotionComposition>(
      () => coder(motionIR),
      'Remotion composition generation failed',
      pipelineConfig,
      'CODER'
    );
    
    logger.step('CODER', '✅ Remotion composition generated successfully');
    logger.info('🖼️ Composition summary:', {
      compositionId: composition.compositionId,
      duration: composition.metadata.duration,
      width: composition.metadata.width,
      height: composition.metadata.height,
      fps: composition.metadata.fps
    });
    
    // Step 4: Render video using Remotion
    logger.step('RENDERER', '🎥 Step 4: Video Rendering (Renderer)');
    
    // Verify image path exists before rendering
    if (!fs.existsSync(imagePath)) {
      throw new Error(`Image file not found during rendering: ${imagePath}`);
    }
    
    const videoPath = await executeWithRetry<string>(
      () => renderVideo(composition, imagePath, pipelineConfig.renderConfig),
      'Video rendering failed',
      pipelineConfig,
      'RENDERER'
    );
    
    // Verify rendered video exists
    if (!fs.existsSync(videoPath)) {
      throw new Error('Video rendering completed but output file was not created');
    }
    
    const videoStats = fs.statSync(videoPath);
    logger.step('RENDERER', '✅ Video rendering completed successfully');
    logger.info('🎥 Video summary:', {
      videoPath,
      fileSize: videoStats.size,
      fileExists: fs.existsSync(videoPath),
      canRead: fs.accessSync(videoPath, fs.constants.R_OK)
    });
    
    // Step 5: Generate URL for frontend
    logger.step('URL_GEN', '🌐 Step 5: URL Generation');
    const { getVideoUrl } = await import('./renderer');
    const videoUrl = await getVideoUrl(videoPath);
    
    logger.step('URL_GEN', '✅ URL generation completed');
    logger.info('🔗 Video URL:', videoUrl);
    
    // Get comprehensive file metadata
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
    
    logger.step('COMPLETE', '🎉 Pipeline completed successfully!', {
      requestId,
      totalProcessingTime: `${processingTime}ms`,
      videoUrl,
      metadata: result.metadata
    });
    
    return result;
    
  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    logger.step('ERROR', `❌ Pipeline failed after ${processingTime}ms`, { 
      requestId, 
      error: error instanceof Error ? error.message : String(error)
    });
    
    // Enhanced error reporting
    if (error instanceof Error) {
      const errorContext = categorizeError(error);
      logger.error('🔍 Error category:', errorContext.category);
      logger.error('📝 Error details:', errorContext.details);
      
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
  stepName: string,
  attempt: number = 1
): Promise<T> {
  try {
    logger.step(stepName, `🔄 Attempt ${attempt}/${config.maxRetries} starting...`);
    const result = await operation();
    logger.step(stepName, `✅ Attempt ${attempt} completed successfully`);
    return result;
  } catch (error) {
    logger.step(stepName, `❌ Attempt ${attempt} failed: ${errorMessage}`, error);
    
    if (attempt < config.maxRetries && config.enableFallbacks) {
      const delay = 1000 * attempt; // Exponential backoff
      logger.step(stepName, `⏳ Retrying in ${delay}ms (attempt ${attempt + 1}/${config.maxRetries})...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return executeWithRetry(operation, errorMessage, config, stepName, attempt + 1);
    }
    
    logger.step(stepName, `💥 All attempts failed for: ${errorMessage}`);
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
  
  if (message.includes('image') || message.includes('mapper') || message.includes('vision') || message.includes('schema')) {
    return { category: 'image_analysis', details: 'Error occurred during image analysis' };
  } else if (message.includes('motion') || message.includes('director') || message.includes('timeline') || message.includes('creative')) {
    return { category: 'motion_generation', details: 'Error occurred during Motion-IR generation' };
  } else if (message.includes('composition') || message.includes('coder') || message.includes('remotion')) {
    return { category: 'composition', details: 'Error occurred during composition generation' };
  } else if (message.includes('render') || message.includes('ffmpeg') || message.includes('video') || message.includes('cli')) {
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
    await import('./mapper');
    logger.info('✅ Mapper module loaded successfully');
  } catch (error) {
    components.mapper = false;
    errors.push(`Mapper module error: ${error}`);
    logger.error('❌ Mapper module error', error);
  }
  
  try {
    await import('./director');
    logger.info('✅ Director module loaded successfully');
  } catch (error) {
    components.director = false;
    errors.push(`Director module error: ${error}`);
    logger.error('❌ Director module error', error);
  }
  
  try {
    await import('./coder');
    logger.info('✅ Coder module loaded successfully');
  } catch (error) {
    components.coder = false;
    errors.push(`Coder module error: ${error}`);
    logger.error('❌ Coder module error', error);
  }
  
  try {
    await import('./renderer');
    logger.info('✅ Renderer module loaded successfully');
  } catch (error) {
    components.renderer = false;
    errors.push(`Renderer module error: ${error}`);
    logger.error('❌ Renderer module error', error);
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
      'Pipeline health monitoring',
      'Enhanced logging and debugging'
    ]
  };
}