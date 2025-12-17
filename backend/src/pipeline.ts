import { mapper } from './mapper';
import { director } from './director';
import { coder } from './coder';
import { renderVideo } from './renderer';

export async function generateVideo(imagePath: string, prompt: string): Promise<string> {
  // Step 1: Mapper - Analyze image to get Schema
  const schema = await mapper(imagePath);

  // Step 2: Director - Transform Schema and prompt to Motion-IR
  const motionIR = director(schema, prompt);

  // Step 3: Coder - Generate Remotion code from Motion-IR
  const code = await coder(motionIR);

  // Step 4: Render video
  const videoUrl = await renderVideo(code);

  return videoUrl;
}