import { NextRequest } from 'next/server';

// Enhanced logging utility
const logger = {
  info: (message: string, data?: any) => {
    console.log(`[${new Date().toISOString()}] [API-VIDEO-INFO] ${message}`, data || '');
  },
  error: (message: string, error?: any, data?: any) => {
    console.error(`[${new Date().toISOString()}] [API-VIDEO-ERROR] ${message}`, error, data || '');
  },
  warn: (message: string, data?: any) => {
    console.warn(`[${new Date().toISOString()}] [API-VIDEO-WARN] ${message}`, data || '');
  },
  debug: (message: string, data?: any) => {
    console.debug(`[${new Date().toISOString()}] [API-VIDEO-DEBUG] ${message}`, data || '');
  }
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const requestId = Math.random().toString(36).substr(2, 9);
  const startTime = Date.now();
  
  try {
    const { filename } = await params;
    
    logger.info(`🎥 [${requestId}] Video serving request:`, {
      filename,
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries())
    });

    // Determine backend URL based on environment
    const backendUrl = process.env.NODE_ENV === 'production' 
      ? process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.reelify.com'
      : 'http://localhost:3001';

    const backendVideoUrl = `${backendUrl}/api/videos/${filename}`;
    logger.info(`🌐 [${requestId}] Forwarding to backend:`, {
      backendUrl,
      backendVideoUrl,
      environment: process.env.NODE_ENV
    });

    // Forward the request to the backend
    const response = await fetch(backendVideoUrl, {
      method: 'GET',
      headers: {
        'Range': request.headers.get('range') || ''
      }
    });

    const processingTime = Date.now() - startTime;
    logger.info(`📡 [${requestId}] Backend response received in ${processingTime}ms`, {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      contentType: response.headers.get('content-type'),
      contentLength: response.headers.get('content-length'),
      contentRange: response.headers.get('content-range'),
      cacheControl: response.headers.get('cache-control')
    });

    if (!response.ok) {
      logger.error(`❌ [${requestId}] Backend video request failed:`, {
        status: response.status,
        statusText: response.statusText,
        url: backendVideoUrl
      });
      return new Response('Video not found', { status: 404 });
    }

    // Get the video data as array buffer
    const videoBuffer = await response.arrayBuffer();
    
    logger.info(`📦 [${requestId}] Video buffer received:`, {
      bufferSize: videoBuffer.byteLength,
      contentType: response.headers.get('content-type')
    });
    
    // Return the video with proper headers
    const finalResponse = new Response(videoBuffer, {
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'video/mp4',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Accept-Ranges': 'bytes',
        'Content-Length': videoBuffer.byteLength.toString(),
        'X-Request-ID': requestId,
        'X-Processing-Time': `${processingTime}ms`
      },
    });
    
    logger.info(`✅ [${requestId}] Video serving completed successfully`, {
      filename,
      bufferSize: videoBuffer.byteLength,
      processingTime: `${processingTime}ms`
    });
    
    return finalResponse;
    
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error(`💥 [${requestId}] Video proxy error after ${processingTime}ms:`, error);
    return new Response('Failed to fetch video', { 
      status: 500,
      headers: {
        'X-Request-ID': requestId,
        'X-Processing-Time': `${processingTime}ms`
      }
    });
  }
}