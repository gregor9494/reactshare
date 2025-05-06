#!/usr/bin/env node

/**
 * Test script to verify yt-dlp functionality with various video URLs
 * 
 * Usage: 
 *   node test-yt-dlp.js <video-url>
 * 
 * Example:
 *   node test-yt-dlp.js https://www.youtube.com/watch?v=dQw4w9WgXcQ
 */

const YTDlpWrap = require('yt-dlp-wrap').default;
const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const { v4: uuidv4 } = require('uuid');

// Check if URL is provided
const url = process.argv[2];
if (!url) {
  console.error('Please provide a video URL as an argument');
  console.error('Usage: node test-yt-dlp.js <video-url>');
  process.exit(1);
}

// Create output directory
const tempDir = path.join(os.tmpdir(), `yt-dlp-test-${uuidv4()}`);
console.log(`Creating temporary directory: ${tempDir}`);
fs.ensureDirSync(tempDir);

// Generate output filename
const fileName = `test-${Date.now()}.mp4`;
const outputPath = path.join(tempDir, fileName);

// Initialize yt-dlp
const ytDlp = new YTDlpWrap();

// Display version info
console.log('Checking yt-dlp version...');
ytDlp.getVersion()
  .then(version => {
    console.log(`yt-dlp version: ${version}`);
  })
  .catch(err => {
    console.error('Error checking yt-dlp version:', err);
    console.error('Make sure yt-dlp is installed and available in your PATH');
    process.exit(1);
  });

// Function to get video information
async function getVideoInfo() {
  const startTime = Date.now();
  console.log(`\n=== Getting info for ${url} ===`);
  
  try {
    const infoCommand = [
      url,
      '--dump-single-json',
      '--no-playlist',
      '--no-check-certificate',
      '--geo-bypass'
    ];
    
    const infoResult = await ytDlp.execPromise(infoCommand);
    const info = JSON.parse(infoResult);
    
    console.log(`\nVideo Information:`);
    console.log(`- Title: ${info.title}`);
    console.log(`- Platform: ${info.extractor}`);
    console.log(`- Duration: ${info.duration} seconds (${Math.floor(info.duration / 60)}m ${info.duration % 60}s)`);
    console.log(`- Available formats: ${info.formats.length}`);
    console.log(`- Best format: ${info.format}`);
    
    const endTime = Date.now();
    console.log(`\nInfo retrieved in ${(endTime - startTime) / 1000} seconds`);
    
    return info;
  } catch (error) {
    console.error('Error getting video info:', error);
    return null;
  }
}

// Function to download video
async function downloadVideo() {
  const startTime = Date.now();
  console.log(`\n=== Downloading ${url} to ${outputPath} ===`);
  
  try {
    // Standard download options
    const options = [
      url,
      '--format', 'bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720][ext=mp4]/best',
      '--merge-output-format', 'mp4',
      '--output', outputPath,
      '--no-playlist',
      '--max-filesize', '50m',
      '--no-warnings',
      '--geo-bypass',
      '--no-check-certificate',
      '--force-ipv4',
    ];
    
    // Execute download
    await ytDlp.execPromise(options);
    
    // Check file size
    const stats = fs.statSync(outputPath);
    const fileSizeMB = stats.size / (1024 * 1024);
    
    const endTime = Date.now();
    const durationSeconds = (endTime - startTime) / 1000;
    
    console.log(`\nDownload completed in ${durationSeconds.toFixed(2)} seconds`);
    console.log(`File saved to: ${outputPath}`);
    console.log(`File size: ${fileSizeMB.toFixed(2)} MB`);
    
    return {
      path: outputPath,
      size: fileSizeMB,
      duration: durationSeconds
    };
  } catch (error) {
    console.error('\nError downloading video:', error);
    console.log('\nTrying fallback method...');
    
    try {
      // Simple fallback options
      const fallbackOptions = [
        url,
        '--format', 'best',
        '--output', outputPath,
        '--no-playlist'
      ];
      
      await ytDlp.execPromise(fallbackOptions);
      
      // Check file size
      const stats = fs.statSync(outputPath);
      const fileSizeMB = stats.size / (1024 * 1024);
      
      const endTime = Date.now();
      const durationSeconds = (endTime - startTime) / 1000;
      
      console.log(`\nFallback download completed in ${durationSeconds.toFixed(2)} seconds`);
      console.log(`File saved to: ${outputPath}`);
      console.log(`File size: ${fileSizeMB.toFixed(2)} MB`);
      
      return {
        path: outputPath,
        size: fileSizeMB,
        duration: durationSeconds,
        usedFallback: true
      };
    } catch (fallbackError) {
      console.error('\nFallback download also failed:', fallbackError);
      return null;
    }
  }
}

// Main function
async function main() {
  try {
    // Get video info
    const info = await getVideoInfo();
    
    if (!info) {
      console.error('Could not get video info, but trying download anyway...');
    }
    
    // Download video
    const result = await downloadVideo();
    
    if (result) {
      console.log('\n=== Test completed successfully ===');
      console.log(`Video downloaded to: ${result.path}`);
      console.log(`Size: ${result.size.toFixed(2)} MB`);
      console.log(`Download time: ${result.duration.toFixed(2)} seconds`);
      if (result.usedFallback) {
        console.log('Note: Used fallback download method');
      }
      
      console.log('\nTest directory will be deleted in 60 seconds...');
      setTimeout(() => {
        try {
          fs.removeSync(tempDir);
          console.log(`Cleaned up test directory: ${tempDir}`);
        } catch (err) {
          console.error('Error cleaning up test directory:', err);
        }
      }, 60000);
    } else {
      console.error('\n=== Test failed: Could not download video ===');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('Test error:', error);
    process.exit(1);
  }
}

// Run the test
main();