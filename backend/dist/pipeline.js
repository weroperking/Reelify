"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateVideo = generateVideo;
exports.checkPipelineHealth = checkPipelineHealth;
exports.getPipelineStats = getPipelineStats;
const mapper_1 = require("./mapper");
const director_1 = require("./director");
const coder_1 = require("./coder");
const renderer_1 = require("./renderer");
const DEFAULT_CONFIG = {
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
async function generateVideo(imagePath, prompt, config = {}) {
    const startTime = Date.now();
    const pipelineConfig = { ...DEFAULT_CONFIG, ...config };
    console.log('🎬 Starting AI-driven Remotion pipeline...');
    console.log('📋 Configuration:', pipelineConfig);
    try {
        // Step 1: Mapper - Analyze image to get comprehensive schema
        console.log('🔍 Step 1: Image Analysis (Mapper)');
        const schema = await executeWithRetry(() => (0, mapper_1.mapper)(imagePath), 'Image analysis failed', pipelineConfig);
        // Validate schema output
        if (pipelineConfig.enableValidation) {
            const schemaValidation = (0, mapper_1.validateSchema)(schema);
            if (!schemaValidation.isValid) {
                throw new Error(`Schema validation failed: ${schemaValidation.errors.join(', ')}`);
            }
        }
        console.log('✅ Image analysis completed');
        console.log('📊 Schema:', JSON.stringify(schema, null, 2));
        // Step 2: Director - Transform schema and prompt to Motion-IR
        console.log('🎭 Step 2: Creative Direction (Director)');
        const motionIR = await executeWithRetry(() => Promise.resolve((0, director_1.director)(schema, prompt, imagePath)), 'Motion-IR generation failed', pipelineConfig);
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
        const composition = await executeWithRetry(() => (0, coder_1.coder)(motionIR), 'Remotion composition generation failed', pipelineConfig);
        console.log('✅ Remotion composition generated');
        console.log('🖼️ Composition metadata:', composition.metadata);
        // Step 4: Render video using Remotion
        console.log('🎥 Step 4: Video Rendering (Renderer)');
        const videoPath = await executeWithRetry(() => (0, renderer_1.renderVideo)(composition, imagePath, pipelineConfig.renderConfig), 'Video rendering failed', pipelineConfig);
        console.log('✅ Video rendering completed');
        // Step 5: Generate URL for frontend
        const { getVideoUrl } = await Promise.resolve().then(() => __importStar(require('./renderer')));
        const videoUrl = await getVideoUrl(videoPath);
        // Get file metadata
        const fs = require('fs');
        const stats = fs.statSync(videoPath);
        const processingTime = Date.now() - startTime;
        const result = {
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
    }
    catch (error) {
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
            }
            else if (errorContext.category === 'motion_generation') {
                enhancedErrorMessage += '. Please check your prompt and try again.';
            }
            else if (errorContext.category === 'rendering') {
                enhancedErrorMessage += '. This might be a temporary issue with the rendering service.';
            }
            throw new Error(enhancedErrorMessage);
        }
        throw new Error(`Unknown pipeline error: ${error}`);
    }
}
// Helper function to execute with retry logic
async function executeWithRetry(operation, errorMessage, config, attempt = 1) {
    try {
        return await operation();
    }
    catch (error) {
        console.error(`Attempt ${attempt} failed:`, errorMessage);
        if (attempt < config.maxRetries && config.enableFallbacks) {
            console.log(`Retrying operation (attempt ${attempt + 1}/${config.maxRetries})...`);
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
            return executeWithRetry(operation, errorMessage, config, attempt + 1);
        }
        throw error;
    }
}
function categorizeError(error) {
    const message = error.message.toLowerCase();
    if (message.includes('image') || message.includes('mapper') || message.includes('vision')) {
        return { category: 'image_analysis', details: 'Error occurred during image analysis' };
    }
    else if (message.includes('motion') || message.includes('director') || message.includes('timeline')) {
        return { category: 'motion_generation', details: 'Error occurred during Motion-IR generation' };
    }
    else if (message.includes('composition') || message.includes('coder') || message.includes('remotion')) {
        return { category: 'composition', details: 'Error occurred during composition generation' };
    }
    else if (message.includes('render') || message.includes('ffmpeg') || message.includes('video')) {
        return { category: 'rendering', details: 'Error occurred during video rendering' };
    }
    else {
        return { category: 'unknown', details: 'Unknown error category' };
    }
}
// Health check function for the entire pipeline
async function checkPipelineHealth() {
    const errors = [];
    const components = {
        mapper: true,
        director: true,
        coder: true,
        renderer: true
    };
    try {
        // Check if required modules can be imported
        await Promise.resolve().then(() => __importStar(require('./mapper')));
        console.log('✅ Mapper module loaded successfully');
    }
    catch (error) {
        components.mapper = false;
        errors.push(`Mapper module error: ${error}`);
    }
    try {
        await Promise.resolve().then(() => __importStar(require('./director')));
        console.log('✅ Director module loaded successfully');
    }
    catch (error) {
        components.director = false;
        errors.push(`Director module error: ${error}`);
    }
    try {
        await Promise.resolve().then(() => __importStar(require('./coder')));
        console.log('✅ Coder module loaded successfully');
    }
    catch (error) {
        components.coder = false;
        errors.push(`Coder module error: ${error}`);
    }
    try {
        await Promise.resolve().then(() => __importStar(require('./renderer')));
        console.log('✅ Renderer module loaded successfully');
    }
    catch (error) {
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
function getPipelineStats() {
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
