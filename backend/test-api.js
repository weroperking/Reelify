require('dotenv').config();
const OpenAI = require('openai');

async function testAPI() {
  try {
    console.log('Testing OpenRouter API...');
    console.log('API Key available:', !!process.env.OPENROUTER_API_KEY);
    console.log('API Key starts with:', process.env.OPENROUTER_API_KEY?.substring(0, 10) + '...');
    
    const openai = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY,
      defaultHeaders: {
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'Reelify',
      },
    });

    const response = await openai.chat.completions.create({
      model: 'microsoft/wizardlm-2-8x22b',
      messages: [{ role: 'user', content: 'Say hello' }],
      max_tokens: 50,
    });

    console.log('API Success! Response:', response.choices[0]?.message?.content);
  } catch (error) {
    console.error('API Test failed:', error.message);
  }
}

testAPI();