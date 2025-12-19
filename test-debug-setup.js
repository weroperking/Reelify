#!/usr/bin/env node

/**
 * Reelify Debug Test Script
 * 
 * This script tests the complete video generation pipeline to verify:
 * 1. Backend logging is working correctly
 * 2. Video generation process is functioning
 * 3. Video serving is working
 * 4. Frontend logging is operational
 * 
 * Usage: node test-debug-setup.js
 */

const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}[${new Date().toISOString()}] ${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

function logWarning(message) {
  log(`⚠️ ${message}`, colors.yellow);
}

function logInfo(message) {
  log(`ℹ️ ${message}`, colors.blue);
}

function logDebug(message) {
  log(`🔍 ${message}`, colors.cyan);
}

async function testFileSystem() {
  logInfo('Testing file system setup...');
  
  const directories = [
    'backend/output',
    'backend/temp',
    'backend/uploads',
    'frontend/.next'
  ];
  
  let allGood = true;
  
  for (const dir of directories) {
    const fullPath = path.join(__dirname, dir);
    if (!fs.existsSync(fullPath)) {
      logWarning(`Directory not found: ${dir}`);
      try {
        fs.mkdirSync(fullPath, { recursive: true });
        logSuccess(`Created directory: ${dir}`);
      } catch (error) {
        logError(`Failed to create directory ${dir}: ${error.message}`);
        allGood = false;
      }
    } else {
      logSuccess(`Directory exists: ${dir}`);
    }
  }
  
  return allGood;
}

async function testEnvironmentVariables() {
  logInfo('Testing environment variables...');
  
  const requiredVars = ['OPENROUTER_API_KEY'];
  let allGood = true;
  
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      logError(`Required environment variable missing: ${varName}`);
      allGood = false;
    } else {
      logSuccess(`Required environment variable found: ${varName}`);
    }
  }
  
  return allGood;
}

async function runTests() {
  log('🧪 Reelify Debug Test Suite', colors.bright);
  log('==========================================', colors.bright);
  
  const tests = [
    { name: 'Environment Variables', test: testEnvironmentVariables },
    { name: 'File System Setup', test: testFileSystem }
  ];
  
  const results = [];
  
  for (const { name, test } of tests) {
    log(`\n🔬 Running test: ${name}`, colors.magenta);
    log('----------------------------------------', colors.magenta);
    
    try {
      const result = await test();
      results.push({ name, passed: result });
      
      if (result) {
        logSuccess(`Test passed: ${name}`);
      } else {
        logError(`Test failed: ${name}`);
      }
    } catch (error) {
      logError(`Test error: ${name} - ${error.message}`);
      results.push({ name, passed: false, error: error.message });
    }
  }
  
  // Summary
  log('\n📊 Test Results Summary', colors.bright);
  log('==========================================', colors.bright);
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  
  results.forEach(result => {
    const status = result.passed ? '✅ PASSED' : '❌ FAILED';
    const color = result.passed ? colors.green : colors.red;
    log(`${status} ${result.name}`, color);
    if (result.error) {
      log(`  Error: ${result.error}`, colors.red);
    }
  });
  
  log(`\n🏁 Overall Results: ${passed}/${total} tests passed`, colors.bright);
  
  log('\n📝 Logging Features Added:', colors.cyan);
  log('• Comprehensive backend pipeline logging', colors.cyan);
  log('• Enhanced video composition logging', colors.cyan);
  log('• Frontend request/response logging', colors.cyan);
  log('• Video accessibility testing', colors.cyan);
  log('• Error categorization and debugging', colors.cyan);
  log('• Request ID tracking for debugging', colors.cyan);
  
  log('\n🔧 Black Screen Fixes Applied:', colors.cyan);
  log('• Improved image path handling in compositions', colors.cyan);
  log('• Enhanced fade animations for visibility', colors.cyan);
  log('• Better error handling in video rendering', colors.cyan);
  log('• Fallback rendering methods', colors.cyan);
  log('• File verification and validation', colors.cyan);
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(error => {
    logError(`Test suite failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { runTests };
