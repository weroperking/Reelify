import OpenAI from 'openai';
import { MotionIR } from './director';

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

export async function coder(motionIR: MotionIR): Promise<string> {
  const prompt = `
Generate a Remotion composition in TypeScript/JSX that implements the following animation instructions:

Motion-IR: ${JSON.stringify(motionIR, null, 2)}

Requirements:
- Use Remotion's <Composition>, <Img>, <spring>, interpolate, etc.
- For 2.5D or 3D, use React-Three-Fiber inside Remotion.
- The composition should be named "MyComposition" and have id "my-comp".
- Duration should match the Motion-IR duration.
- FPS: 30, Width: 1920, Height: 1080.
- Include necessary imports.
- Assume the image is available as a prop or hardcoded URL for now.
- Implement camera moves, animations, effects as described.

Output only the complete TSX code, no explanations.
`;

  const response = await getOpenAIClient().chat.completions.create({
    model: process.env.CODER_MODEL || 'microsoft/wizardlm-2-8x22b',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 2000,
  });

  const code = response.choices[0]?.message?.content;
  if (!code) throw new Error('No code generated');

  return code;
}