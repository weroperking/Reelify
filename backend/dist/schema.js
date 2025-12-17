"use strict";
// Motion Intermediate Representation (Motion-IR) Schema
// This defines the standard data structure for video timeline generation
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateMotionIR = validateMotionIR;
exports.createBasicTimeline = createBasicTimeline;
// Utility functions for validation
function validateMotionIR(timeline) {
    const errors = [];
    // Basic validation
    if (!timeline.assets || timeline.assets.length === 0) {
        errors.push('Timeline must have at least one asset');
    }
    if (!timeline.tracks || timeline.tracks.length === 0) {
        errors.push('Timeline must have at least one track');
    }
    // Validate timeline duration
    const maxLayerEnd = Math.max(...timeline.tracks.flatMap(track => track.layers.map(layer => layer.startTime + layer.duration)), 0);
    if (maxLayerEnd > timeline.metadata.duration) {
        errors.push('Some layers extend beyond timeline duration');
    }
    // Validate keyframes
    timeline.tracks.forEach((track, trackIndex) => {
        track.layers.forEach((layer, layerIndex) => {
            layer.keyframes.forEach((keyframe, kfIndex) => {
                if (keyframe.time < 0 || keyframe.time > timeline.metadata.duration) {
                    errors.push(`Keyframe ${kfIndex} in layer ${layerIndex} of track ${trackIndex} has invalid time`);
                }
            });
        });
    });
    return {
        isValid: errors.length === 0,
        errors
    };
}
// Helper function to create a basic timeline structure
function createBasicTimeline(duration = 5, width = 1920, height = 1080, fps = 30) {
    return {
        version: '1.0',
        metadata: {
            projectName: 'Motion-IR Generated Video',
            createdAt: new Date().toISOString(),
            duration,
            fps,
            width,
            height,
            backgroundColor: '#000000'
        },
        assets: [],
        tracks: [],
        camera: {
            type: '2D',
            position: { x: 0, y: 0, z: 0 },
            target: { x: 0, y: 0, z: 0 },
            movements: []
        },
        globalEffects: []
    };
}
