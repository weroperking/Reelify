import { NextRequest } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;

    // Determine backend URL based on environment
    const backendUrl = process.env.NODE_ENV === 'production' 
      ? process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.reelify.com'
      : 'http://localhost:3001';

    // Forward the request to the backend
    const response = await fetch(`${backendUrl}/api/videos/${filename}`);

    if (!response.ok) {
      return new Response('Video not found', { status: 404 });
    }

    // Get the video data as array buffer
    const videoBuffer = await response.arrayBuffer();
    
    // Return the video with proper headers
    return new Response(videoBuffer, {
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'video/mp4',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
    
  } catch (error) {
    console.error('Video proxy error:', error);
    return new Response('Failed to fetch video', { status: 500 });
  }
}