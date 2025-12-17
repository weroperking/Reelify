# Reelify - Image-to-Video Animation System

A sophisticated image-to-video animation system that transforms static images into dynamic videos using AI-powered analysis and Remotion for rendering.

## Pipeline Overview

User Input → [Mapper] → [Schema] → [Director] → [Motion-IR] → [Coder] → Rendered Video

## Architecture

### Backend Pipeline
- **Mapper**: Uses `qwen/qwen3-vl-8b-instruct` via unified OpenRouter API for image analysis
- **Director**: Transforms visual analysis into animation instructions
- **Coder**: Uses `minimax/minimax-m2:free` via unified OpenRouter API for Remotion code generation
- **Renderer**: Handles video rendering and serving

### Frontend
- Next.js application with drag-and-drop image upload
- Real-time video generation interface
- Support for custom animation prompts and options

## Setup Instructions

### Prerequisites
- Node.js 18+ and npm/pnpm
- OpenRouter API key for both image analysis and code generation: `OPENROUTER_API_KEY`

### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   Edit `backend/.env`:
   ```env
   PORT=3001
   OPENROUTER_API_KEY=your_openrouter_api_key_here
   TEMP_DIR=./temp
   OUTPUT_DIR=./output
   ```

4. **Build the backend**
   ```bash
   npm run build
   ```

5. **Start the backend server**
   ```bash
   npm run dev
   ```

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the frontend development server**
   ```bash
   npm run dev
   ```

## Usage

1. **Start both servers**:
   - Backend: `http://localhost:3001`
   - Frontend: `http://localhost:3000`

2. **Upload an image** using the drag-and-drop interface

3. **Enter an animation prompt** (e.g., "Make this coffee shop photo cinematic")

4. **Add optional parameters** (e.g., "animate only steam, add text overlay")

5. **Generate video** and download the result

## API Endpoints

### POST `/generate-video`
- **Body**: `multipart/form-data`
  - `image`: Image file
  - `prompt`: Animation prompt string
- **Response**: `{ videoUrl: string }`

### GET `/api/videos/:filename`
- Serves generated video files

## Example Prompts

- "Make this coffee shop photo cinematic"
- "Animate only the steam"
- "Make it full 3D with camera orbit"
- "Add text overlay with fade-in"
- "Loop the background subtly"

## File Structure

```
backend/
├── src/
│   ├── mapper.ts      # Image analysis using Qwen
│   ├── director.ts    # Animation instruction generation
│   ├── coder.ts       # Remotion code generation
│   ├── renderer.ts    # Video rendering and serving
│   ├── pipeline.ts    # Pipeline orchestration
│   └── index.ts       # Express server
├── temp/              # Temporary files
├── output/            # Generated videos
└── .env               # Environment configuration

frontend/
├── src/app/
│   ├── page.tsx       # Main application interface
│   └── layout.tsx     # Root layout
└── public/            # Static assets
```

## Technologies Used

- **Backend**: Express.js, TypeScript, Unified OpenRouter API (Qwen + Minimax models)
- **Frontend**: Next.js, React, TailwindCSS
- **Video Rendering**: Remotion
- **3D Graphics**: React-Three-Fiber, Three.js
- **File Upload**: Multer

## Pipeline Stages

1. **Mapper**: Analyzes uploaded images using vision-language model
2. **Schema**: Creates structured representation of visual elements
3. **Director**: Converts analysis into animation instructions
4. **Motion-IR**: Intermediate representation for animations
5. **Coder**: Generates executable Remotion/React code
6. **Renderer**: Produces final video output

## Error Handling

The application includes comprehensive error handling for:
- Missing API keys
- Image processing failures
- Code generation errors
- Video rendering issues
- File serving problems

## Development

To modify the pipeline:
1. Update individual stage files in `backend/src/`
2. Rebuild backend: `npm run build`
3. Restart backend server
4. Test changes through frontend interface

## Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

## License

ISC License - see LICENSE file for details