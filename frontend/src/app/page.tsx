"use client";

import { useState } from 'react';
import { useDropzone } from 'react-dropzone';

// Enhanced logging utility for frontend
const logger = {
  info: (message: string, data?: any) => {
    console.log(`[${new Date().toISOString()}] [FRONTEND-INFO] ${message}`, data || '');
  },
  error: (message: string, error?: any, data?: any) => {
    console.error(`[${new Date().toISOString()}] [FRONTEND-ERROR] ${message}`, error, data || '');
  },
  warn: (message: string, data?: any) => {
    console.warn(`[${new Date().toISOString()}] [FRONTEND-WARN] ${message}`, data || '');
  },
  debug: (message: string, data?: any) => {
    console.debug(`[${new Date().toISOString()}] [FRONTEND-DEBUG] ${message}`, data || '');
  }
};

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState('');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [options, setOptions] = useState('');
  const [debugInfo, setDebugInfo] = useState<any>({});

  const onDrop = (acceptedFiles: File[]) => {
    const droppedFile = acceptedFiles[0];
    logger.info('📁 File dropped/selected', {
      fileName: droppedFile.name,
      fileSize: droppedFile.size,
      fileType: droppedFile.type
    });
    setFile(droppedFile);
    setError(null);
    setVideoUrl(null);
    setDebugInfo({});
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
    },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024 // 50MB
  });

  const handleSubmit = async () => {
    if (!file || !prompt) {
      logger.warn('⚠️ Form submission blocked - missing file or prompt');
      return;
    }

    setLoading(true);
    setError(null);
    setVideoUrl(null);
    const fullPrompt = options ? `${prompt}. ${options}` : prompt;
    const formData = new FormData();
    formData.append('image', file);
    formData.append('prompt', fullPrompt);

    const requestId = Math.random().toString(36).substr(2, 9);
    const startTime = Date.now();

    logger.info(`🚀 [${requestId}] Starting video generation request`);
    logger.info(`📋 [${requestId}] Request details:`, {
      fileName: file.name,
      fileSize: file.size,
      prompt: fullPrompt.substring(0, 100) + (fullPrompt.length > 100 ? '...' : ''),
      environment: process.env.NODE_ENV,
      apiBaseUrl: process.env.NODE_ENV === 'production' 
        ? process.env.NEXT_PUBLIC_API_URL || 'https://api.reelify.com'
        : (process.env.NEXT_PUBLIC_API_URL || '/api')
    });

    try {
      // Use environment-aware API URL (always use local Next.js API route for proxy)
      const API_BASE_URL = process.env.NODE_ENV === 'production' 
        ? process.env.NEXT_PUBLIC_API_URL || 'https://api.reelify.com'
        : (process.env.NEXT_PUBLIC_API_URL || '/api');

      const requestUrl = `${API_BASE_URL}/generate-video`;
      logger.info(`🌐 [${requestId}] Making request to:`, requestUrl);

      const response = await fetch(requestUrl, {
        method: 'POST',
        body: formData,
      });
      
      const processingTime = Date.now() - startTime;
      logger.info(`📡 [${requestId}] Response received in ${processingTime}ms`, {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });
      
      if (!response.ok) {
        let errorData = {};
        try {
          errorData = await response.json();
          logger.error(`❌ [${requestId}] Server error response:`, errorData);
        } catch (parseError) {
          logger.error(`❌ [${requestId}] Failed to parse error response:`, parseError);
          errorData = { error: `Server error: ${response.status} ${response.statusText}` };
        }
        throw new Error((errorData as any).error || `Server error: ${response.status}`);
      }
      
      const data = await response.json();
      logger.info(`✅ [${requestId}] Success response received:`, {
        hasVideoUrl: !!data.videoUrl,
        videoUrl: data.videoUrl,
        metadata: data.metadata,
        processingTime: data.processingTime
      });
      
      if (!data.videoUrl) {
        throw new Error('No video URL received from server');
      }
      
      // Validate the video URL
      const videoUrl = data.videoUrl;
      logger.info(`🎥 [${requestId}] Setting video URL:`, videoUrl);
      
      // Test video accessibility
      try {
        const videoTestResponse = await fetch(videoUrl, { method: 'HEAD' });
        logger.info(`🧪 [${requestId}] Video accessibility test:`, {
          url: videoUrl,
          status: videoTestResponse.status,
          ok: videoTestResponse.ok,
          contentType: videoTestResponse.headers.get('content-type')
        });
      } catch (testError) {
        logger.warn(`⚠️ [${requestId}] Video accessibility test failed:`, testError);
      }
      
      setVideoUrl(videoUrl);
      
      // Store debug info
      setDebugInfo({
        requestId,
        processingTime: Date.now() - startTime,
        serverProcessingTime: data.processingTime,
        videoUrl: data.videoUrl,
        metadata: data.metadata,
        environment: process.env.NODE_ENV
      });

    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error(`💥 [${requestId}] Video generation failed after ${processingTime}ms:`, error);
      
      let errorMessage = 'An error occurred while generating the video. Please try again.';
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        errorMessage = 'Cannot connect to the server. Please ensure the backend is running on port 3001.';
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      logger.error(`📝 [${requestId}] Final error message:`, errorMessage);
      setError(errorMessage);
      
      // Store error debug info
      setDebugInfo({
        requestId,
        processingTime,
        error: error instanceof Error ? error.message : String(error),
        environment: process.env.NODE_ENV
      });
    } finally {
      setLoading(false);
      logger.info(`🏁 [${requestId}] Video generation process completed`);
    }
  };

  // Test video loading function
  const testVideoLoad = async (url: string) => {
    logger.info('🧪 Testing video load:', url);
    try {
      const response = await fetch(url, { method: 'HEAD' });
      logger.info('✅ Video load test result:', {
        status: response.status,
        ok: response.ok,
        contentType: response.headers.get('content-type'),
        contentLength: response.headers.get('content-length')
      });
      return response.ok;
    } catch (error) {
      logger.error('❌ Video load test failed:', error);
      return false;
    }
  };

  // Log component mount
  logger.info('🎬 Reelify frontend component mounted', {
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold mb-6 text-center">Reelify</h1>
        
        {/* Debug Info Panel */}
        {Object.keys(debugInfo).length > 0 && (
          <div className="mb-4 p-3 bg-gray-100 rounded text-xs font-mono">
            <details>
              <summary className="cursor-pointer font-bold">🔍 Debug Info</summary>
              <pre className="mt-2 whitespace-pre-wrap">{JSON.stringify(debugInfo, null, 2)}</pre>
            </details>
          </div>
        )}
        
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-6 mb-4 text-center cursor-pointer ${
            isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
          }`}
        >
          <input {...getInputProps()} />
          {file ? (
            <div>
              <p className="text-gray-700 font-medium">{file.name}</p>
              <p className="text-sm text-gray-500">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          ) : (
            <p className="text-gray-500">
              {isDragActive ? 'Drop the image here' : 'Drag & drop an image, or click to select'}
            </p>
          )}
        </div>
        <textarea
          value={prompt}
          onChange={(e) => {
            setPrompt(e.target.value);
            logger.debug('📝 Prompt updated:', e.target.value.substring(0, 50) + '...');
          }}
          placeholder="Enter animation prompt (e.g., 'Make this coffee shop photo cinematic')"
          className="w-full p-3 border border-gray-300 rounded-lg mb-4 resize-none"
          rows={3}
        />
        <input
          type="text"
          value={options}
          onChange={(e) => {
            setOptions(e.target.value);
            logger.debug('⚙️ Options updated:', e.target.value);
          }}
          placeholder="Additional options (e.g., 'animate only steam, add text overlay')"
          className="w-full p-3 border border-gray-300 rounded-lg mb-4"
        />
        <button
          onClick={handleSubmit}
          disabled={!file || !prompt || loading}
          className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {loading ? 'Generating...' : 'Generate Video'}
        </button>
        
        {/* Video Display */}
        {videoUrl && (
          <div className="mt-6">
            <h3 className="font-medium mb-2">Generated Video:</h3>
            <video 
              controls 
              className="w-full rounded-lg mb-4"
              onLoadStart={() => logger.info('🎬 Video element: load start')}
              onCanPlay={() => logger.info('🎬 Video element: can play')}
              onError={(e) => {
                logger.error('🎬 Video element: playback error', e);
                testVideoLoad(videoUrl);
              }}
              onPlay={() => logger.info('🎬 Video element: playback started')}
              onPause={() => logger.info('🎬 Video element: playback paused')}
              onEnded={() => logger.info('🎬 Video element: playback ended')}
            >
              <source src={videoUrl} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
            <a
              href={videoUrl}
              download="reelify-video.mp4"
              className="w-full bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 text-center block"
              onClick={() => logger.info('📥 Download link clicked:', videoUrl)}
            >
              Download Video
            </a>
            
            {/* Video URL Display */}
            <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
              <strong>Video URL:</strong> 
              <a 
                href={videoUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline ml-2"
              >
                {videoUrl}
              </a>
            </div>
          </div>
        )}
        
        {/* Error Display */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
            <p className="text-red-600 text-sm font-medium">Error:</p>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}
        
        {/* Environment Info */}
        <div className="mt-4 p-2 bg-gray-50 rounded text-xs text-gray-600">
          <strong>Environment:</strong> {process.env.NODE_ENV} | 
          <strong> API Base:</strong> {process.env.NODE_ENV === 'production' 
            ? process.env.NEXT_PUBLIC_API_URL || 'https://api.reelify.com'
            : (process.env.NEXT_PUBLIC_API_URL || '/api')} |
          <strong> Time:</strong> {new Date().toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}
