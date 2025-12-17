"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapper = mapper;
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
async function mapper(imagePath) {
    // For now, return a mock schema to test the pipeline
    // TODO: Replace with actual image analysis using vision models
    console.log(`Processing image: ${imagePath}`);
    // Mock response for testing
    const mockSchema = {
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
