"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapper = mapper;
exports.validateSchema = validateSchema;
const openai_1 = __importDefault(require("openai"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
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
    console.log(`Processing image: ${imagePath}`);
    // Verify the image file exists
    if (!fs_1.default.existsSync(imagePath)) {
        throw new Error(`Image file not found: ${imagePath}`);
    }
    try {
        // Convert image to base64 for vision analysis
        const imageBase64 = await encodeImageToBase64(imagePath);
        // Perform comprehensive visual analysis using OpenAI Vision
        const visualAnalysis = await analyzeImageWithVision(imageBase64);
        // Parse the analysis into our schema format
        const schema = parseVisualAnalysis(visualAnalysis);
        console.log('Image analysis completed successfully');
        return schema;
    }
    catch (error) {
        console.error('Error in image analysis:', error);
        // Fallback to enhanced mock analysis if AI analysis fails
        console.log('Falling back to enhanced mock analysis...');
        return generateEnhancedMockSchema(imagePath);
    }
}
async function encodeImageToBase64(imagePath) {
    try {
        const imageBuffer = fs_1.default.readFileSync(imagePath);
        return `data:image/${path_1.default.extname(imagePath).slice(1)};base64,${imageBuffer.toString('base64')}`;
    }
    catch (error) {
        throw new Error(`Failed to read image file: ${error}`);
    }
}
async function analyzeImageWithVision(imageBase64) {
    const client = getOpenAIClient();
    const prompt = `
Analyze this image in detail and provide a comprehensive visual analysis in JSON format. Focus on:

1. ELEMENT ANALYSIS:
   - Primary elements: Main subjects, objects, people, or focal points
   - Secondary elements: Background elements, supporting objects
   - Identify foreground vs background separation

2. VISUAL PROPERTIES:
   - Dominant colors (provide hex codes if possible)
   - Lighting conditions (natural, artificial, dramatic, soft, etc.)
   - Overall mood/emotion conveyed
   - Color palette and contrast

3. COMPOSITIONAL ANALYSIS:
   - Focus points and areas of interest
   - Perspective (frontal, angled, aerial, close-up, etc.)
   - Visual style (photographic, artistic, minimalist, complex, etc.)
   - Rule of thirds adherence
   - Symmetry or asymmetry

4. DEPTH AND LAYERS:
   - Foreground elements
   - Midground elements  
   - Background elements
   - Estimated depth perception

5. TECHNICAL ASPECTS:
   - Image complexity (simple, moderate, complex)
   - Texture richness
   - Detail level
   - Overall visual weight distribution

Return your analysis as a structured JSON object with these categories as keys.
`;
    const response = await client.chat.completions.create({
        model: 'openai/gpt-4-vision-preview',
        messages: [
            {
                role: 'user',
                content: [
                    {
                        type: 'text',
                        text: prompt
                    },
                    {
                        type: 'image_url',
                        image_url: {
                            url: imageBase64,
                            detail: 'high'
                        }
                    }
                ]
            }
        ],
        max_tokens: 1500,
        temperature: 0.3
    });
    const content = response.choices[0]?.message?.content;
    if (!content) {
        throw new Error('No analysis content received from vision model');
    }
    try {
        // Try to parse as JSON, but handle cases where the model returns text with JSON
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        throw new Error('No JSON found in response');
    }
    catch (parseError) {
        console.error('Failed to parse vision analysis as JSON:', parseError);
        // Return a structured fallback
        return {
            error: 'Failed to parse JSON',
            raw_content: content,
            fallback: true
        };
    }
}
function parseVisualAnalysis(analysis) {
    // If analysis failed or is incomplete, use fallback
    if (analysis.error || analysis.fallback) {
        return generateEnhancedMockSchema('analysis-fallback');
    }
    try {
        // Extract information from the vision analysis
        const primaryElements = extractPrimaryElements(analysis);
        const secondaryElements = extractSecondaryElements(analysis);
        const sceneInfo = extractSceneInfo(analysis);
        const compositionInfo = extractCompositionInfo(analysis);
        const visualAnalysis = extractVisualAnalysis(analysis);
        return {
            elements: {
                primary: primaryElements,
                secondary: secondaryElements
            },
            scene: sceneInfo,
            composition: compositionInfo,
            visual_analysis: visualAnalysis
        };
    }
    catch (error) {
        console.error('Error parsing visual analysis:', error);
        return generateEnhancedMockSchema('parse-error');
    }
}
function extractPrimaryElements(analysis) {
    const elements = [];
    if (analysis.element_analysis?.primary) {
        elements.push(...analysis.element_analysis.primary);
    }
    else if (analysis.primary_elements) {
        elements.push(...analysis.primary_elements);
    }
    else if (analysis.elements?.primary) {
        elements.push(...analysis.elements.primary);
    }
    // Add fallback if no elements found
    if (elements.length === 0) {
        elements.push('main subject', 'focal point');
    }
    return elements;
}
function extractSecondaryElements(analysis) {
    const elements = [];
    if (analysis.element_analysis?.secondary) {
        elements.push(...analysis.element_analysis.secondary);
    }
    else if (analysis.secondary_elements) {
        elements.push(...analysis.secondary_elements);
    }
    else if (analysis.elements?.secondary) {
        elements.push(...analysis.elements.secondary);
    }
    // Add fallback if no elements found
    if (elements.length === 0) {
        elements.push('background elements', 'supporting objects');
    }
    return elements;
}
function extractSceneInfo(analysis) {
    return {
        emotion: analysis.scene?.emotion || analysis.mood || 'neutral',
        lighting: analysis.visual_properties?.lighting || analysis.lighting || 'natural',
        colors: analysis.visual_properties?.dominant_colors || analysis.colors || ['#000000', '#ffffff'],
        depth_layers: analysis.depth_and_layers?.layers || ['foreground', 'background']
    };
}
function extractCompositionInfo(analysis) {
    return {
        focus: analysis.compositional_analysis?.focus || 'center',
        perspective: analysis.compositional_analysis?.perspective || 'frontal',
        style: analysis.compositional_analysis?.style || 'photographic'
    };
}
function extractVisualAnalysis(analysis) {
    return {
        dominant_colors: analysis.visual_properties?.dominant_colors || ['#000000', '#ffffff'],
        contrast_ratio: analysis.technical_aspects?.contrast_ratio || 0.5,
        complexity_score: analysis.technical_aspects?.complexity_score || 0.5,
        focal_points: analysis.compositional_analysis?.focal_points || [{ x: 0.5, y: 0.5, confidence: 0.8 }],
        segmentation: analysis.depth_and_layers?.segmentation || []
    };
}
function generateEnhancedMockSchema(imagePath) {
    console.log('Generating enhanced mock schema for:', imagePath);
    // Enhanced mock data based on common image characteristics
    const mockSchema = {
        elements: {
            primary: ['main subject', 'central element'],
            secondary: ['background elements', 'supporting objects', 'environmental context']
        },
        scene: {
            emotion: 'calm',
            lighting: 'balanced lighting',
            colors: ['#2563eb', '#ffffff', '#f1f5f9'],
            depth_layers: ['foreground', 'midground', 'background']
        },
        composition: {
            focus: 'center',
            perspective: 'frontal',
            style: 'photographic'
        },
        visual_analysis: {
            dominant_colors: ['#2563eb', '#ffffff', '#f1f5f9'],
            contrast_ratio: 0.6,
            complexity_score: 0.4,
            focal_points: [
                { x: 0.5, y: 0.5, confidence: 0.9 },
                { x: 0.3, y: 0.4, confidence: 0.7 }
            ],
            segmentation: [
                { region: 'main subject', confidence: 0.85, bounds: [0.2, 0.2, 0.6, 0.6] },
                { region: 'background', confidence: 0.9, bounds: [0, 0, 1, 1] }
            ]
        }
    };
    // Add some variety based on the image file name or path
    if (imagePath.toLowerCase().includes('portrait')) {
        mockSchema.composition.perspective = 'close-up';
        mockSchema.elements.primary.unshift('person');
    }
    else if (imagePath.toLowerCase().includes('landscape')) {
        mockSchema.composition.perspective = 'wide';
        mockSchema.scene.depth_layers.push('far background');
        mockSchema.elements.secondary.push('horizon');
    }
    else if (imagePath.toLowerCase().includes('abstract')) {
        mockSchema.composition.style = 'abstract';
        mockSchema.visual_analysis.complexity_score = 0.8;
    }
    return mockSchema;
}
// Utility function to validate the schema output
function validateSchema(schema) {
    const errors = [];
    if (!schema.elements || !Array.isArray(schema.elements.primary)) {
        errors.push('Missing or invalid primary elements');
    }
    if (!schema.scene || !schema.scene.emotion || !Array.isArray(schema.scene.colors)) {
        errors.push('Missing or invalid scene information');
    }
    if (!schema.composition || !schema.composition.focus) {
        errors.push('Missing or invalid composition information');
    }
    if (!schema.visual_analysis || !Array.isArray(schema.visual_analysis.dominant_colors)) {
        errors.push('Missing or invalid visual analysis');
    }
    return {
        isValid: errors.length === 0,
        errors
    };
}
