import OpenAI from 'openai';
import fs from 'fs';

export interface Schema {
  elements: {
    primary: string[];
    secondary: string[];
  };
  scene: {
    emotion: string;
    lighting: string;
    colors: string[];
    depth_layers: string[];
  };
  composition: {
    focus: string;
    perspective: string;
    style: string;
  };
}

// Lazy initialize OpenAI client to ensure environment variables are loaded
let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openai) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY environment variable is not set. Please check your .env file.');
    }

    openai = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: apiKey,
      defaultHeaders: {
        'HTTP-Referer': 'http://localhost:3000', // Site URL for rankings on openrouter.ai
        'X-Title': 'Reelify', // Site title for rankings on openrouter.ai
      },
    });
  }
  return openai;
}

export async function mapper(imagePath: string): Promise<Schema> {
  // For now, return a mock schema to test the pipeline
  // TODO: Replace with actual image analysis using vision models
  
  console.log(`Processing image: ${imagePath}`);
  
  // Mock response for testing
  const mockSchema: Schema = {
    elements: {
      primary: ["main subject"],
      secondary: ["background elements"]
    },
    scene: {
      emotion: "calm",
      lighting: "soft lighting",
      colors: ["red", "white"],
      depth_layers: ["foreground", "background"]
    },
    composition: {
      focus: "center",
      perspective: "frontal",
      style: "minimalist"
    }
  };

  // Add a small delay to simulate processing
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return mockSchema;
}