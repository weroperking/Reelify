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

const openai = new OpenAI({
  apiKey: process.env.QWEN_API_KEY,
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
});

export async function mapper(imagePath: string): Promise<Schema> {
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString('base64');

  const response = await openai.chat.completions.create({
    model: 'qwen/qwen3-vl-8b-instruct',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Analyze this image and extract visual elements for animation. Provide a JSON object with the following structure: 
            
{
  "elements": {
    "primary": ["list of main subjects"],
    "secondary": ["supporting elements"]
  },
  "scene": {
    "emotion": "overall mood",
    "lighting": "lighting description", 
    "colors": ["dominant colors"],
    "depth_layers": ["foreground", "mid", "background descriptions"]
  },
  "composition": {
    "focus": "main focus point",
    "perspective": "camera angle",
    "style": "photography style"
  }
}

Analyze the image and return only the JSON object without any additional text or formatting.`,
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${base64Image}`,
            },
          },
        ],
      },
    ],
    max_tokens: 1000,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('No response from Qwen');

  // Parse JSON from response - handle potential markdown formatting
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON found in response');
  
  const schema: Schema = JSON.parse(jsonMatch[0]);
  return schema;
}