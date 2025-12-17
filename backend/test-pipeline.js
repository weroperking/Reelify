require('dotenv').config();
const { generateVideo } = require('./dist/pipeline.js');

async function testPipeline() {
  try {
    console.log('Testing pipeline with sample data...');
    console.log('API Key available:', !!process.env.OPENROUTER_API_KEY);
    const result = await generateVideo('/tmp/test_image.png', 'make it cinematic');
    console.log('Success! Video generated at:', result);
  } catch (error) {
    console.error('Pipeline failed with error:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

testPipeline();