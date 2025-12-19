import { NextRequest, NextResponse } from 'next/server';

// Enhanced logging utility
const logger = {
  info: (message: string, data?: any) => {
    console.log(`[${new Date().toISOString()}] [API-GENERATE-INFO] ${message}`, data || '');
  },
  error: (message: string, error?: any, data?: any) => {
    console.error(`[${new Date().toISOString()}] [API-GENERATE-ERROR] ${message}`, error, data || '');
  },
  warn: (message: string, data?: any) => {
    console.warn(`[${new Date().toISOString()}] [API-GENERATE-WARN] ${message}`, data || '');
  },
  debug: (message: string, data?: any) => {
    console.debug(`[${new Date().toISOString()}] [API-GENERATE-DEBUG] ${message}`, data || '');
  }
};

export async function POST(request: NextRequest) {
  const requestId = Math.random().toString(36).substr(2, 9);
  const startTime = Date.now();
  
  logger.info(`🚀 [${requestId}] API video generation request received`);
  
  try {
    // Log request details
    logger.info(`📋 [${requestId}] Request details:`, {
      method: request.method,
      url: request.url,
      headers: Object.fromEntries(request.headers.entries()),
      contentType: request.headers.get('content-type')
    });

    // Get the form data from the request
    const formData = await request.formData();
    logger.info(`📄 [${requestId}] Form data received`, {
      fields: Array.from(formData.keys()),
      hasImage: formData.has('image'),
      hasPrompt: formData.has('prompt')
    });
    
    // Create a new FormData to forward to the backend
    const backendFormData = new FormData();
    
    // Forward all form fields
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        logger.info(`📎 [${requestId}] Field '${key}' is a file:`, {
          name: value.name,
          size: value.size,
          type: value.type
        });
      }
      backendFormData.append(key, value);
    }

    // Determine backend URL based on environment
    const backendUrl = process.env.NODE_ENV === 'production' 
      ? process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.reelify.com'
      : 'http://localhost:3001';

    const fullBackendUrl = `${backendUrl}/generate-video`;
    logger.info(`🌐 [${requestId}] Forwarding to backend:`, {
      backendUrl,
      fullUrl: fullBackendUrl,
      environment: process.env.NODE_ENV
    });

    // Forward the request to the backend
    const backendResponse = await fetch(fullBackendUrl, {
      method: 'POST',
      body: backendFormData,
      // Don't set Content-Type header, let the browser set it for FormData
    });

    const processingTime = Date.now() - startTime;
    logger.info(`📡 [${requestId}] Backend response received in ${processingTime}ms`, {
      status: backendResponse.status,
      statusText: backendResponse.statusText,
      ok: backendResponse.ok,
      headers: Object.fromEntries(backendResponse.headers.entries())
    });

    if (!backendResponse.ok) {
      const errorData = await backendResponse.json().catch(() => ({}));
      logger.error(`❌ [${requestId}] Backend error response:`, {
        status: backendResponse.status,
        errorData
      });
      
      return NextResponse.json(
        { 
          error: errorData.error || `Backend error: ${backendResponse.status}`,
          requestId,
          backendError: errorData
        },
        { status: backendResponse.status }
      );
    }

    const data = await backendResponse.json();
    logger.info(`✅ [${requestId}] Backend success response:`, {
      hasVideoUrl: !!data.videoUrl,
      videoUrl: data.videoUrl,
      metadata: data.metadata,
      processingTime: data.processingTime
    });
    
    // Validate response data
    if (!data.videoUrl) {
      logger.error(`❌ [${requestId}] No video URL in backend response:`, data);
      return NextResponse.json(
        { 
          error: 'No video URL received from backend',
          requestId 
        },
        { status: 500 }
      );
    }
    
    // Test video URL accessibility
    const videoUrl = data.videoUrl;
    try {
      const videoTestResponse = await fetch(videoUrl, { method: 'HEAD' });
      logger.info(`🧪 [${requestId}] Video URL accessibility test:`, {
        url: videoUrl,
        status: videoTestResponse.status,
        ok: videoTestResponse.ok,
        contentType: videoTestResponse.headers.get('content-type')
      });
      
      if (!videoTestResponse.ok) {
        logger.warn(`⚠️ [${requestId}] Video URL may not be accessible:`, {
          status: videoTestResponse.status,
          url: videoUrl
        });
      }
    } catch (testError) {
      logger.warn(`⚠️ [${requestId}] Video URL accessibility test failed:`, testError);
    }
    
    return NextResponse.json(data);
    
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error(`💥 [${requestId}] Proxy request failed after ${processingTime}ms:`, error);
    
    return NextResponse.json(
      { 
        error: 'Failed to proxy request to backend',
        requestId,
        processingTime,
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}