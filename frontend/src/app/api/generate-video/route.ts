import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Get the form data from the request
    const formData = await request.formData();
    
    // Create a new FormData to forward to the backend
    const backendFormData = new FormData();
    
    // Forward all form fields
    for (const [key, value] of formData.entries()) {
      backendFormData.append(key, value);
    }

    // Determine backend URL based on environment
    const backendUrl = process.env.NODE_ENV === 'production' 
      ? process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.reelify.com'
      : 'http://localhost:3001';

    // Forward the request to the backend
    const response = await fetch(`${backendUrl}/generate-video`, {
      method: 'POST',
      body: backendFormData,
      // Don't set Content-Type header, let the browser set it for FormData
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.error || `Backend error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to proxy request to backend' },
      { status: 500 }
    );
  }
}