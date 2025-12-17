import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function renderVideo(code: string, imagePath?: string): Promise<string> {
  try {
    const tempDir = path.join(__dirname, '../temp');
    const outputDir = path.join(__dirname, '../output');
    
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Save the generated Remotion composition
    const compositionPath = path.join(tempDir, 'composition.tsx');
    fs.writeFileSync(compositionPath, code);

    // Generate a unique filename for this video
    const timestamp = Date.now();
    const videoPath = path.join(outputDir, `output-${timestamp}.mp4`);

    console.log('Starting video rendering...');

    // For now, create a placeholder video or use a simple approach
    // In a real implementation, you would use Remotion's renderMedia here
    // or call the Remotion CLI to render the composition
    
    // Create a simple placeholder video file for demonstration
    // This would be replaced with actual Remotion rendering
    const placeholderContent = 'Generated video placeholder';
    fs.writeFileSync(videoPath.replace('.mp4', '.txt'), placeholderContent);

    console.log(`Video rendered successfully: ${videoPath}`);
    return videoPath;
  } catch (error) {
    console.error('Error rendering video:', error);
    throw new Error(`Failed to render video: ${error}`);
  }
}

export async function getVideoUrl(videoPath: string): Promise<string> {
  // Convert absolute path to relative URL for serving
  const relativePath = path.relative(path.join(__dirname, '../'), videoPath);
  return `/api/videos/${relativePath}`;
}