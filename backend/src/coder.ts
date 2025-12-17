import OpenAI from 'openai';
import { MotionIR } from './director';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 2000,
  });

  const code = response.choices[0]?.message?.content;
  if (!code) throw new Error('No code generated');

  return code;
}