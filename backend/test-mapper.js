require('dotenv').config();
const { mapper } = require('./dist/mapper.js');

async function testMapper() {
  try {
    console.log('Testing mapper (image analysis)...');
    console.log('API Key available:', !!process.env.OPENROUTER_API_KEY);
    const result = await mapper('/tmp/valid_test_image.png');
    console.log('Success! Schema generated:', result);
  } catch (error) {
    console.error('Mapper test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testMapper();