import express from 'express';
import multer from 'multer';
import cors from 'cors';
import { generateVideo } from './pipeline';

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

app.post('/generate-video', upload.single('image'), async (req, res) => {
  try {
    const { prompt } = req.body;
    const imagePath = req.file?.path;

    if (!imagePath || !prompt) {
      return res.status(400).json({ error: 'Image and prompt are required' });
    }

    const videoUrl = await generateVideo(imagePath, prompt);
    res.json({ videoUrl });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate video' });
  }
});

app.listen(port, () => {
  console.log(`Backend server running on port ${port}`);
});