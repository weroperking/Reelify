import express from 'express';
import multer from 'multer';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { generateVideo, PipelineResult } from './pipeline';

// Load environment variables
dotenv.config();

const app = express();
const port = parseInt(process.env.PORT || '3001');

// Enhanced logging utility
const logger = {
  info: (message: string, data?: any) => {
    console.log(`[${new Date().toISOString()}] [INFO] ${message}`, data || '');
  },
  error: (message: string, error?: any, data?: any) => {
    console.error(`[${new Date().toISOString()}] [ERROR] ${message}`, error, data || '');
  },
  warn: (message: string, data?: any) => {
    console.warn(`[${new Date().toISOString()}] [WARN] ${message}`, data || '');
  },
  debug: (message: string, data?: any) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`[${new Date().toISOString()}] [DEBUG] ${message}`, data || '');
    }
  }
};

// Log startup information
logger.info('🚀 Starting Reelify Backend Server');
logger.info(`📍 Port: ${port}`);
logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);

// Check if critical environment variables are available
if (!process.env.OPENROUTER_API_KEY) {
  logger.error('CRITICAL ERROR: OPENROUTER_API_KEY is not set!');
  logger.error('Please check your .env file and ensure it contains: OPENROUTER_API_KEY=your_key_here');
  process.exit(1);
}

app.use(cors());
app.use(express.json());

// Serve static files from output directory
const outputDir = path.join(__dirname, '../output');
logger.info(`📁 Output directory: ${outputDir}`);

if (!fs.existsSync(outputDir)) {
  logger.info('📂 Creating output directory');
  fs.mkdirSync(outputDir, { recursive: true });
}

// Verify output directory permissions
try {
  fs.accessSync(outputDir, fs.constants.R_OK | fs.constants.W_OK);
  logger.info('✅ Output directory is readable and writable');
} catch (error) {
  logger.error('❌ Output directory permissions error', error);
}

app.use('/api/videos', express.static(outputDir, {
  setHeaders: (res, path) => {
    logger.debug(`🎥 Serving video file: ${path}`);
    res.set('Cache-Control', 'public, max-age=31536000');
    res.set('Content-Type', 'video/mp4');
  }
}));

// Configure multer for file uploads
const upload = multer({ 
  dest: 'uploads/',
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    logger.debug(`📤 File upload attempt: ${file.originalname} (${file.mimetype})`);
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  logger.info('🏥 Health check requested');
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// List available videos endpoint
app.get('/api/videos', (req, res) => {
  try {
    logger.info('📋 Listing available videos');
    const files = fs.readdirSync(outputDir)
      .filter(file => file.endsWith('.mp4'))
      .map(file => {
        const stats = fs.statSync(path.join(outputDir, file));
        return {
          filename: file,
          size: stats.size,
          created: stats.birthtime,
          url: `/api/videos/${file}`
        };
      });
    
    logger.info(`📊 Found ${files.length} video files`);
    res.json(files);
  } catch (error) {
    logger.error('❌ Error listing videos', error);
    res.status(500).json({ error: 'Failed to list videos' });
  }
});

// Main video generation endpoint
app.post('/generate-video', upload.single('image'), async (req, res) => {
  const requestId = Math.random().toString(36).substr(2, 9);
  const startTime = Date.now();
  
  logger.info(`🎬 [${requestId}] Video generation request started`);
  logger.info(`📤 [${requestId}] Request details:`, {
    hasFile: !!req.file,
    fileName: req.file?.originalname,
    promptLength: req.body?.prompt?.length || 0,
    headers: Object.fromEntries(Object.entries(req.headers).filter(([key]) => 
      ['content-type', 'user-agent'].includes(key)
    ))
  });

  try {
    const { prompt } = req.body;
    const imagePath = req.file?.path;
    const imageOriginalName = req.file?.originalname;

    // Validate inputs
    if (!imagePath || !prompt) {
      logger.error(`❌ [${requestId}] Missing required inputs`, { hasImage: !!imagePath, hasPrompt: !!prompt });
      return res.status(400).json({ 
        error: 'Image and prompt are required',
        requestId 
      });
    }

    // Verify uploaded file exists
    if (!fs.existsSync(imagePath)) {
      logger.error(`❌ [${requestId}] Uploaded file not found`, { imagePath });
      return res.status(400).json({ 
        error: 'Uploaded file not found',
        requestId 
      });
    }

    const fileStats = fs.statSync(imagePath);
    logger.info(`✅ [${requestId}] File validation passed`, {
      originalName: imageOriginalName,
      size: fileStats.size,
      path: imagePath
    });

    // Generate video with enhanced error handling
    logger.info(`🎥 [${requestId}] Starting video generation pipeline...`);
    const result = await generateVideo(imagePath, prompt);
    
    // Verify output file was created
    if (!fs.existsSync(result.videoPath)) {
      throw new Error('Video file was not created by the pipeline');
    }

    const outputStats = fs.statSync(result.videoPath);
    const processingTime = Date.now() - startTime;
    
    logger.info(`🎉 [${requestId}] Video generation completed successfully`, {
      processingTime: `${processingTime}ms`,
      outputPath: result.videoPath,
      outputSize: outputStats.size,
      videoUrl: result.videoUrl,
      metadata: result.metadata
    });
    
    // The new pipeline returns a PipelineResult with videoUrl already generated
    res.json({ 
      videoUrl: result.videoUrl,
      metadata: result.metadata,
      processingTime: result.processingTime,
      requestId
    });

    // Clean up uploaded file after successful processing
    try {
      fs.unlinkSync(imagePath);
      logger.info(`🧹 [${requestId}] Cleaned up uploaded file: ${imagePath}`);
    } catch (cleanupError) {
      logger.warn(`⚠️ [${requestId}] Failed to clean up uploaded file`, cleanupError);
    }

  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    logger.error(`💥 [${requestId}] Video generation failed after ${processingTime}ms`, error);
    
    // Return more specific error information
    let errorMessage = 'Unknown error occurred';
    let errorCode = 'UNKNOWN_ERROR';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Categorize errors for better debugging
      if (error.message.includes('image') || error.message.includes('vision')) {
        errorCode = 'IMAGE_ANALYSIS_ERROR';
      } else if (error.message.includes('remotion') || error.message.includes('render')) {
        errorCode = 'RENDER_ERROR';
      } else if (error.message.includes('timeout')) {
        errorCode = 'TIMEOUT_ERROR';
      } else if (error.message.includes('OPENROUTER_API_KEY')) {
        errorCode = 'API_KEY_ERROR';
      }
    }
    
    res.status(500).json({ 
      error: `Failed to generate video: ${errorMessage}`,
      errorCode,
      requestId,
      processingTime
    });

    // Clean up uploaded file on error
    if (req.file?.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
        logger.info(`🧹 [${requestId}] Cleaned up uploaded file after error`);
      } catch (cleanupError) {
        logger.warn(`⚠️ [${requestId}] Failed to clean up uploaded file after error`, cleanupError);
      }
    }
  }
});

// Global error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('💥 Unhandled server error', error);
  res.status(500).json({ 
    error: 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// Start server with enhanced logging
const server = app.listen(port, '0.0.0.0', () => {
  logger.info(`🚀 Backend server running on port ${port}`);
  logger.info(`🌐 Server URL: http://localhost:${port}`);
  logger.info(`🎥 Video endpoint: http://localhost:${port}/api/videos`);
  logger.info(`💊 Health check: http://localhost:${port}/health`);
});

// Handle server errors
server.on('error', (error: any) => {
  logger.error('💥 Server error', error);
  if (error.code === 'EADDRINUSE') {
    logger.error(`❌ Port ${port} is already in use`);
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('👋 Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('🛑 SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('👋 Server closed');
    process.exit(0);
  });
});