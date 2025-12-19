"use client";

import { useState, useEffect } from 'react';
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
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [showDebug, setShowDebug] = useState(false);
  const [generationStartTime, setGenerationStartTime] = useState<number | null>(null);
  
  // Progress state management
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');

  // Hook for progress simulation during video generation
  const steps = [
    'Initializing AI model...',
    'Analyzing image content...',
    'Generating animation frames...',
    'Applying motion effects...',
    'Optimizing video quality...',
    'Finalizing output...'
  ];

  useEffect(() => {
    if (!loading) {
      setProgress(0);
      setCurrentStep('');
      return;
    }

    let currentStepIndex = 0;
    setCurrentStep(steps[0]);

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        
        const newProgress = prev + Math.random() * 15 + 5;
        const stepIndex = Math.floor((newProgress / 100) * steps.length);
        
        if (stepIndex !== currentStepIndex && stepIndex < steps.length) {
          currentStepIndex = stepIndex;
          setCurrentStep(steps[currentStepIndex]);
        }
        
        return Math.min(newProgress, 95); // Cap at 95% until actual completion
      });
    }, 300);

    return () => clearInterval(interval);
  }, [loading]);

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
    setGenerationStartTime(Date.now());
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
      
      // Set to 100% when response received
      setProgress(100);
      setCurrentStep('Video generation completed!');
      
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
      
      if (error instanceof TypeError && (error as any).message.includes('fetch')) {
        errorMessage = 'Cannot connect to the server. Please ensure the backend is running on port 3001.';
      } else if (error instanceof Error) {
        errorMessage = (error as any).message;
      }
      
      logger.error(`📝 [${requestId}] Final error message:`, errorMessage);
      setError(errorMessage);
      
      // Store error debug info
      setDebugInfo({
        requestId,
        processingTime,
        error: (error as any) instanceof Error ? (error as any).message : String(error),
        environment: process.env.NODE_ENV
      });
    } finally {
      setLoading(false);
      setGenerationStartTime(null);
      logger.info(`🏁 [${requestId}] Video generation process completed`);
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  // Log component mount
  logger.info('🎬 Reelify frontend component mounted', {
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });

  return (
    <div className={`min-h-screen transition-all duration-500 ${isDarkMode ? 'dark' : 'light'}`}>
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute top-40 right-20 w-72 h-72 bg-cyan-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute bottom-20 left-1/3 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-2000"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 flex justify-between items-center p-6">
        <div className="flex items-center space-x-4">
          <div className="text-3xl font-bold gradient-text">
            Reelify
          </div>
          <div className="px-3 py-1 bg-purple-500/20 text-purple-300 text-sm rounded-full border border-purple-500/30">
            AI Video Generator
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setShowDebug(!showDebug)}
            className="glass-card px-4 py-2 text-sm hover:bg-white/20 transition-all duration-300"
          >
            🔍 Debug
          </button>
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="glass-card p-2 hover:bg-white/20 transition-all duration-300"
          >
            {isDarkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 container mx-auto px-6 pb-12">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12 fade-in">
            <h1 className="text-5xl font-bold mb-4 gradient-text">
              Transform Images into Videos
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Upload an image and watch our AI bring it to life with stunning animations and effects
            </p>
          </div>

          {/* Main Card */}
          <div className="glass-card p-8 mb-8 slide-up">
            {/* Debug Info Panel */}
            {showDebug && Object.keys(debugInfo).length > 0 && (
              <div className="mb-6 p-4 bg-black/30 rounded-lg border border-gray-600 text-xs font-mono">
                <details>
                  <summary className="cursor-pointer font-bold text-cyan-400">🔍 Debug Info</summary>
                  <pre className="mt-2 whitespace-pre-wrap text-green-400">{JSON.stringify(debugInfo, null, 2)}</pre>
                </details>
              </div>
            )}
            
            <div className="grid md:grid-cols-2 gap-8">
              {/* Upload Section */}
              <div>
                <h3 className="text-xl font-semibold mb-4 text-purple-300">📸 Upload Image</h3>
                <div
                  {...getRootProps()}
                  className={`dropzone ${isDragActive ? 'active' : ''}`}
                >
                  <input {...getInputProps()} />
                  {file ? (
                    <div className="space-y-2">
                      <div className="text-green-400 text-2xl">✅</div>
                      <p className="text-white font-medium">{file.name}</p>
                      <p className="text-sm text-gray-400">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="text-4xl">📁</div>
                      <div>
                        <p className="text-white font-medium">
                          {isDragActive ? 'Drop the image here' : 'Drag & drop an image, or click to select'}
                        </p>
                        <p className="text-sm text-gray-400 mt-2">
                          Supports: JPEG, PNG, GIF, WebP (max 50MB)
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Configuration Section */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold mb-4 text-purple-300">🎬 Animation Prompt</h3>
                  <textarea
                    value={prompt}
                    onChange={(e) => {
                      setPrompt(e.target.value);
                      logger.debug('📝 Prompt updated:', e.target.value.substring(0, 50) + '...');
                    }}
                    placeholder="Describe how you want your image animated (e.g., 'Make this coffee shop scene cinematic with steam rising')"
                    className="w-full h-32"
                    rows={4}
                  />
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-4 text-purple-300">⚙️ Additional Options</h3>
                  <input
                    type="text"
                    value={options}
                    onChange={(e) => {
                      setOptions(e.target.value);
                      logger.debug('⚙️ Options updated:', e.target.value);
                    }}
                    placeholder="Additional effects (e.g., 'add text overlay', 'only animate background')"
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* Generation Progress */}
            {loading && (
              <div className="mt-8 p-6 bg-gradient-to-r from-purple-500/10 to-cyan-500/10 rounded-xl border border-purple-500/30">
                <div className="text-center space-y-4">
                  <div className="loading-spinner"></div>
                  <h4 className="text-lg font-semibold text-purple-300">Generating Your Video...</h4>
                  <p className="text-cyan-300">{currentStep}</p>
                  
                  <div className="space-y-2">
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                    <p className="text-sm text-gray-400">{Math.round(progress)}% complete</p>
                  </div>

                  {generationStartTime && (
                    <p className="text-xs text-gray-500">
                      Started at: {formatTime(generationStartTime)}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Generate Button */}
            <div className="mt-8 text-center">
              <button
                onClick={handleSubmit}
                disabled={!file || !prompt || loading}
                className="btn-primary text-lg px-8 py-4 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center space-x-2">
                    <div className="loading-spinner w-5 h-5"></div>
                    <span>Generating...</span>
                  </span>
                ) : (
                  '🚀 Generate Video'
                )}
              </button>
            </div>
          </div>

          {/* Video Display */}
          {videoUrl && (
            <div className="glass-card p-8 slide-up">
              <h3 className="text-2xl font-semibold mb-6 text-center gradient-text">✨ Your Generated Video</h3>
              
              <div className="max-w-3xl mx-auto">
                <video 
                  controls 
                  className="w-full rounded-xl mb-6"
                  onLoadStart={() => logger.info('🎬 Video element: load start')}
                  onCanPlay={() => logger.info('🎬 Video element: can play')}
                  onError={(e) => {
                    logger.error('🎬 Video element: playback error', e);
                  }}
                  onPlay={() => logger.info('🎬 Video element: playback started')}
                  onPause={() => logger.info('🎬 Video element: playback paused')}
                  onEnded={() => logger.info('🎬 Video element: playback ended')}
                >
                  <source src={videoUrl} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
                
                <div className="flex flex-col sm:flex-row gap-4">
                  <a
                    href={videoUrl}
                    download="reelify-video.mp4"
                    className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 px-6 rounded-xl hover:from-green-600 hover:to-emerald-600 text-center font-semibold transition-all duration-300 transform hover:scale-105"
                    onClick={() => logger.info('📥 Download link clicked:', videoUrl)}
                  >
                    📥 Download Video
                  </a>
                  
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(videoUrl);
                      logger.info('📋 Video URL copied to clipboard:', videoUrl);
                    }}
                    className="flex-1 glass-card py-3 px-6 hover:bg-white/20 transition-all duration-300 font-semibold"
                  >
                    📋 Copy URL
                  </button>
                </div>
                
                {/* Video URL Display */}
                <div className="mt-4 p-3 bg-black/30 rounded-lg border border-gray-600">
                  <strong className="text-cyan-400">Video URL:</strong> 
                  <a 
                    href={videoUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline ml-2 break-all"
                  >
                    {videoUrl}
                  </a>
                </div>
              </div>
            </div>
          )}
          
          {/* Error Display */}
          {error && (
            <div className="alert alert-error slide-up">
              <div className="flex items-center space-x-2">
                <span className="text-xl">❌</span>
                <div>
                  <p className="font-medium">Error:</p>
                  <p className="text-sm">{error}</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Environment Info */}
          <div className="mt-8 p-4 bg-black/20 rounded-lg border border-gray-700 text-xs text-gray-400 text-center">
            <div className="flex flex-wrap justify-center items-center gap-4">
              <span><strong>Environment:</strong> {process.env.NODE_ENV}</span>
              <span><strong>API Base:</strong> {process.env.NODE_ENV === 'production' 
                ? process.env.NEXT_PUBLIC_API_URL || 'https://api.reelify.com'
                : (process.env.NEXT_PUBLIC_API_URL || '/api')}</span>
              <span><strong>Time:</strong> {new Date().toLocaleTimeString()}</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
