require('dotenv').config();
const { renderVideo } = require('./dist/renderer.js');

async function testRenderer() {
  try {
    console.log('Testing video renderer...');
    const dummyCode = 'console.log("Hello World");';
    const result = await renderVideo(dummyCode, '/tmp/valid_test_image.png');
    console.log('Success! Video rendered at:', result);
  } catch (error) {
    console.error('Renderer test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testRenderer();