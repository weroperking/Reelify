"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.coder = coder;
const openai_1 = __importDefault(require("openai"));
const openai = new openai_1.default({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: 'https://openrouter.ai/api/v1',
});
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
    const response = await openai.chat.completions.create({
        model: 'minimax/minimax-m2:free',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2000,
    });
    const code = response.choices[0]?.message?.content;
    if (!code)
        throw new Error('No code generated');
    return code;
}
