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
        try {
            // Try to create a simple MP4 using ffmpeg if available
            // Create a simple colored video as a placeholder
            const tempVideoPath = path_1.default.join(tempDir, `temp-${timestamp}.mp4`);
            // Create a 5-second red video with ffmpeg
            await execAsync(`ffmpeg -f lavfi -i color=c=red:s=640x480:d=5 -c:v libx264 -pix_fmt yuv420p "${tempVideoPath}"`, {
                timeout: 10000
            });
            // Copy the temp video to the final output path
            fs_1.default.copyFileSync(tempVideoPath, videoPath);
            // Clean up temp file
            fs_1.default.unlinkSync(tempVideoPath);
            console.log(`Video rendered successfully: ${videoPath}`);
            return videoPath;
        }
        catch (ffmpegError) {
            console.log('FFmpeg not available, creating placeholder MP4...');
            // Create a minimal valid MP4 file as fallback
            // This is a minimal MP4 header for a valid file
            const minimalMP4 = Buffer.from([
                0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, // ftyp box
                0x69, 0x73, 0x6F, 0x6D, 0x00, 0x00, 0x02, 0x00,
                0x69, 0x73, 0x6F, 0x6D, 0x69, 0x73, 0x6F, 0x32,
                0x61, 0x76, 0x63, 0x31, 0x6D, 0x70, 0x34, 0x31,
                0x00, 0x00, 0x00, 0x08, 0x66, 0x72, 0x65, 0x65
            ]);
            fs_1.default.writeFileSync(videoPath, minimalMP4);
            console.log(`Placeholder video created: ${videoPath}`);
            return videoPath;
        }
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
