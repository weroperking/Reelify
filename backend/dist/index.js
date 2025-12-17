"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const dotenv_1 = __importDefault(require("dotenv"));
const pipeline_1 = require("./pipeline");
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 3001;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Serve static files from output directory
const outputDir = path_1.default.join(__dirname, '../output');
if (!fs_1.default.existsSync(outputDir)) {
    fs_1.default.mkdirSync(outputDir, { recursive: true });
}
app.use('/api/videos', express_1.default.static(outputDir));
// Configure multer for file uploads
const upload = (0, multer_1.default)({ dest: 'uploads/' });
app.post('/generate-video', upload.single('image'), async (req, res) => {
    try {
        const { prompt } = req.body;
        const imagePath = req.file?.path;
        if (!imagePath || !prompt) {
            return res.status(400).json({ error: 'Image and prompt are required' });
        }
        const videoPath = await (0, pipeline_1.generateVideo)(imagePath, prompt);
        // Convert file path to URL
        const videoUrl = `http://localhost:${port}/api/videos/${path_1.default.basename(videoPath)}`;
        res.json({ videoUrl });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to generate video' });
    }
});
app.listen(port, () => {
    console.log(`Backend server running on port ${port}`);
});
