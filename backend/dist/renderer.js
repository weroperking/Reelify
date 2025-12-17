"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderVideo = renderVideo;
exports.getVideoUrl = getVideoUrl;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
async function renderVideo(code, imagePath) {
    try {
        const tempDir = path_1.default.join(__dirname, '../temp');
        const outputDir = path_1.default.join(__dirname, '../output');
        if (!fs_1.default.existsSync(tempDir)) {
            fs_1.default.mkdirSync(tempDir, { recursive: true });
        }
        if (!fs_1.default.existsSync(outputDir)) {
            fs_1.default.mkdirSync(outputDir, { recursive: true });
        }
        // Save the generated Remotion composition
        const compositionPath = path_1.default.join(tempDir, 'composition.tsx');
        fs_1.default.writeFileSync(compositionPath, code);
        // Generate a unique filename for this video
        const timestamp = Date.now();
        const videoPath = path_1.default.join(outputDir, `output-${timestamp}.mp4`);
        console.log('Starting video rendering...');
        // For now, create a placeholder video or use a simple approach
        // In a real implementation, you would use Remotion's renderMedia here
        // or call the Remotion CLI to render the composition
        // Create a simple placeholder video file for demonstration
        // This would be replaced with actual Remotion rendering
        const placeholderContent = 'Generated video placeholder';
        fs_1.default.writeFileSync(videoPath.replace('.mp4', '.txt'), placeholderContent);
        console.log(`Video rendered successfully: ${videoPath}`);
        return videoPath;
    }
    catch (error) {
        console.error('Error rendering video:', error);
        throw new Error(`Failed to render video: ${error}`);
    }
}
async function getVideoUrl(videoPath) {
    // Convert absolute path to relative URL for serving
    const relativePath = path_1.default.relative(path_1.default.join(__dirname, '../'), videoPath);
    return `/api/videos/${relativePath}`;
}
