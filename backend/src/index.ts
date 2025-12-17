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
const port = process.env.PORT || 3001;

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
    // Convert file path to URL
    const videoUrl = `http://localhost:${port}/api/videos/${path.basename(videoPath)}`;
    
    res.json({ videoUrl });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate video' });
  }
});

app.listen(port, () => {
  console.log(`Backend server running on port ${port}`);
});