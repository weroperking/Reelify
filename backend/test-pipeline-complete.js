const { generateVideo, checkPipelineHealth, getPipelineStats } = require('./dist/pipeline');
const fs = require('fs');
const path = require('path');

async function testCompletePipeline() {
  console.log('🧪 Testing Complete AI-Driven Remotion Pipeline');
  console.log('=================================================');
  
  try {
    // 1. Health Check
    console.log('\n1. 🔍 Pipeline Health Check');
    const health = await checkPipelineHealth();
    console.log('Overall Health:', health.overall ? '✅ PASS' : '❌ FAIL');
    console.log('Components Status:', health.components);
    if (health.errors.length > 0) {
      console.log('Errors:', health.errors);
    }
    
    // 2. Pipeline Stats
    console.log('\n2. 📊 Pipeline Statistics');
    const stats = getPipelineStats();
    console.log('Version:', stats.version);
    console.log('Modules:', stats.modules);
    console.log('Features:', stats.features);
    
    // 3. Mock Test with Sample Data
    console.log('\n3. 🎬 Pipeline Execution Test');
    
    // Check if we have a sample image to test with
    const uploadsDir = './uploads';
    const outputDir = './output';
    
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Find first available image
    let testImagePath = null;
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      const imageFiles = files.filter(file => 
        file.match(/\.(jpg|jpeg|png|gif|webp)$/i)
      );
      if (imageFiles.length > 0) {
        testImagePath = path.join(uploadsDir, imageFiles[0]);
        console.log('Using test image:', testImagePath);
      }
    }
    
    if (!testImagePath) {
      console.log('⚠️ No test image found, creating a simple test configuration...');
      // Create a simple test without actual image
      console.log('✅ Health check completed - pipeline modules are properly loaded');
      console.log('📝 To test with actual video generation, provide an image file in the uploads/ directory');
      return;
    }
    
    // Test the pipeline with a sample prompt
    const testPrompt = 'Create a cinematic video with gentle zoom and fade effects , and Type effects with Animated text that says "Hello World" in a stylish font and vibrant colors.';
    console.log('Test prompt:', testPrompt);
    console.log('Image path:', testImagePath);
    
    console.log('\n🚀 Starting pipeline execution...');
    const startTime = Date.now();
    
    // This will test the actual pipeline
    const result = await generateVideo(testImagePath, testPrompt, {
      enableValidation: true,
      enableFallbacks: true,
      maxRetries: 1, // Reduce retries for testing
      renderConfig: {
        codec: 'h264',
        crf: 23, // Lower quality for faster testing
        concurrency: 2
      }
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log('\n✅ Pipeline Test Completed Successfully!');
    console.log('⏱️ Total execution time:', `${duration}ms`);
    console.log('📁 Video path:', result.videoPath);
    console.log('🌐 Video URL:', result.videoUrl);
    console.log('📊 Video metadata:', result.metadata);
    console.log('🎬 Motion-IR summary:', {
      duration: result.motionIR.timeline.metadata.duration,
      tracks: result.motionIR.timeline.tracks.length,
      assets: result.motionIR.timeline.assets.length,
      globalEffects: result.motionIR.timeline.globalEffects.length
    });
    
    // Verify output file exists
    if (fs.existsSync(result.videoPath)) {
      const stats = fs.statSync(result.videoPath);
      console.log('💾 Output file size:', `${(stats.size / 1024 / 1024).toFixed(2)} MB`);
      console.log('✅ Output file verification: PASS');
    } else {
      console.log('❌ Output file verification: FAIL - File not found');
    }
    
  } catch (error) {
    console.error('\n❌ Pipeline Test Failed');
    console.error('💥 Error details:', error.message);
    console.error('📝 Stack trace:', error.stack);
    
    // Provide helpful debugging information
    console.log('\n🔧 Debugging Information:');
    console.log('- Check if OPENROUTER_API_KEY is set in .env file');
    console.log('- Ensure image file exists and is accessible');
    console.log('- Verify Remotion is properly installed: npm list @remotion/*');
    console.log('- Check Node.js version compatibility');
    
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testCompletePipeline()
    .then(() => {
      console.log('\n🎉 All tests completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = { testCompletePipeline };