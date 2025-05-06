#!/usr/bin/env node

/**
 * This script tests the yt-dlp functionality without going through the full application.
 * Usage: node scripts/test-yt-dlp.js [URL]
 * Example: node scripts/test-yt-dlp.js https://www.youtube.com/watch?v=dQw4w9WgXcQ
 */

const YTDlpWrap = require('yt-dlp-wrap').default;
const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const { v4: uuidv4 } = require('uuid');

// Parse command line arguments
const url = process.argv[2];

if (!url) {
  console.error('Please provide a URL to download');
  console.error('Usage: node scripts/test-yt-dlp.js [URL]');
  process.exit(1);
}

console.log(`Testing yt-dlp with URL: ${url}`);

// Create a temporary directory for the download
const tempDir = path.join(os.tmpdir(), `reactshare-test-${uuidv4()}`);
const outputPath = path.join(tempDir, 'video.mp4');

async function main() {
  try {
    // Ensure the temp directory exists
    console.log(`Creating temporary directory: ${tempDir}`);
    await fs.ensureDir(tempDir);
    
    // Initialize yt-dlp
    console.log('Initializing yt-dlp...');
    const ytDlp = new YTDlpWrap();
    
    // Check version
    try {
      const version = await ytDlp.getVersion();
      console.log(`yt-dlp version: ${version}`);
    } catch (err) {
      console.error('Failed to get yt-dlp version. Is it installed and in PATH?');
      process.exit(1);
    }
    
    // Set download options
    const options = [
      url,
      '--format', 'mp4',  // Prefer MP4 format
      '--output', outputPath,
      '--no-playlist',    // Don't download playlists
      '--max-filesize', '50m',  // Limit to 50MB to match the production limit
    ];
    
    // Download the video
    console.log('Downloading video...');
    console.log(`Command: yt-dlp ${options.join(' ')}`);
    
    await ytDlp.execPromise(options);
    
    // Check if file exists and has content
    const fileStats = await fs.stat(outputPath);
    console.log(`Download complete! File size: ${(fileStats.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`File saved to: ${outputPath}`);
    
    console.log('\nTest completed successfully!');
    console.log('Note: The temporary file will not be automatically deleted.');
    console.log('You can delete it manually if needed.');
    
  } catch (error) {
    console.error('Error during download:', error);
    process.exit(1);
  }
}

main();