import express from 'express';
import multer from 'multer';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { generateVideo } from './pipeline';

// Load environment variables
dotenv.config();

const app = express();
const port = parseInt(process.env.PORT || '3001');

// Check if critical environment variables are available
if (!process.env.OPENROUTER_API_KEY) {
  console.error('CRITICAL ERROR: OPENROUTER_API_KEY is not set!');
  console.error('Please check your .env file and ensure it contains: OPENROUTER_API_KEY=your_key_here');
}

app.use(cors());
app.use(express.json());

// Serve static files from output directory
const outputDir = path.join(__dirname, '../output');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}
app.use('/api/videos', express.static(outputDir));

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

app.post('/generate-video', upload.single('image'), async (req, res) => {
  try {
    const { prompt } = req.body;
    const imagePath = req.file?.path;

    if (!imagePath || !prompt) {
      return res.status(400).json({ error: 'Image and prompt are required' });
    }

    const videoPath = await generateVideo(imagePath, prompt);
    // Convert file path to environment-aware URL
    const host = process.env.BACKEND_HOST || 'localhost';
    const protocol = process.env.FRONTEND_URL ? 'https' : 'http';
    const frontendHost = process.env.FRONTEND_URL || `${host}:3000`;
    const videoUrl = `${protocol}://${frontendHost}/api/videos/${path.basename(videoPath)}`;
    
    res.json({ videoUrl });
  } catch (error) {
    console.error('Video generation error:', error);
    // Return more specific error information
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ error: `Failed to generate video: ${errorMessage}` });
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Backend server running on port ${port}`);
});