"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.coder = coder;
const openai_1 = __importDefault(require("openai"));
// Lazy initialize OpenAI client to ensure environment variables are loaded
let openai = null;
function getOpenAIClient() {
    if (!openai) {
        const apiKey = process.env.OPENROUTER_API_KEY;
        if (!apiKey) {
            throw new Error('OPENROUTER_API_KEY environment variable is not set. Please check your .env file.');
        }
        openai = new openai_1.default({
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
async function coder(motionIR) {
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
    if (!code)
        throw new Error('No code generated');
    return code;
}
