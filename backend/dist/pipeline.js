"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateVideo = generateVideo;
const mapper_1 = require("./mapper");
const director_1 = require("./director");
const coder_1 = require("./coder");
const renderer_1 = require("./renderer");
async function generateVideo(imagePath, prompt) {
    try {
        // Step 1: Mapper - Analyze image to get Schema
        const schema = await (0, mapper_1.mapper)(imagePath);
        // Step 2: Director - Transform Schema and prompt to Motion-IR
        const motionIR = (0, director_1.director)(schema, prompt);
        // Step 3: Coder - Generate Remotion code from Motion-IR
        const code = await (0, coder_1.coder)(motionIR);
        // Step 4: Render video
        const videoPath = await (0, renderer_1.renderVideo)(code, imagePath);
        return videoPath;
    }
    catch (error) {
        console.error('Pipeline error:', error);
        throw error;
    }
}
