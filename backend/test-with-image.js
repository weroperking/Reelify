const { generateVideo } = require('./dist/pipeline');

async function testWithRealImage() {
  console.log('🎬 Testing Pipeline with Real Image');
  console.log('====================================');
  
  const imagePath = './uploads/03526f85769088a1fd139e784e7b817d';
  const prompt = 'Create a cinematic video with gentle zoom and fade effects';
  
  try {
    console.log('📷 Image path:', imagePath);
    console.log('📝 Prompt:', prompt);
    console.log('\n🚀 Starting pipeline execution...\n');
    
    const startTime = Date.now();
    const result = await generateVideo(imagePath, prompt, {
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
    
    // Check if output file exists
    const fs = require('fs');
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
    process.exit(1);
  }
}

testWithRealImage();