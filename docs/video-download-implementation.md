# Video Download Implementation with yt-dlp

This document describes the implementation of video downloading using the `yt-dlp` library for the ReactShare application.

## Overview

The implementation allows users to:
- Enter URLs from various video platforms (YouTube, TikTok, Twitter, etc.)
- Download the videos using the yt-dlp library
- Store the videos in Supabase storage
- Track download status and handle errors

## Setup Requirements

### 1. Install yt-dlp

The system requires the `yt-dlp` binary to be installed on the server machine. It should be available in the PATH.

```bash
# On macOS with Homebrew
brew install yt-dlp

# On Ubuntu/Debian
sudo apt update
sudo apt install yt-dlp

# On Windows with Chocolatey
choco install yt-dlp
```

Verify it's installed correctly:
```bash
yt-dlp --version
```

### 2. Required NPM Packages

The following additional packages are needed:
- `yt-dlp-wrap`: Node.js wrapper for yt-dlp
- `fs-extra`: Enhanced file system operations

These should already be installed by running:
```bash
pnpm add yt-dlp-wrap fs-extra @types/fs-extra
```

### 3. Database Migration

Run the SQL migration to add the necessary columns to the `source_videos` table in Supabase:

1. Navigate to the Supabase dashboard
2. Go to SQL Editor
3. Execute the SQL in the `migrations/add_columns_to_source_videos.sql` file
   
This adds:
- `error_message`: Stores any error messages during download
- `public_url`: Stores the public URL to access the video

### 4. Supabase Storage Setup

The `source-videos` bucket in Supabase Storage will be automatically created when the first video is downloaded. The implementation includes code to check if the bucket exists and create it if it doesn't.

The bucket is created with:
- Public access enabled (for easy playback)
- Default file size limits based on your Supabase plan

If you prefer to create it manually instead:
1. Go to Storage in the Supabase dashboard
2. Create a new bucket named `source-videos`
3. Configure the permissions as needed for your security requirements

## How It Works

### Backend Process

1. **Request Handling**: 
   - User submits a video URL through the frontend
   - API endpoint validates the URL and creates a database record
   - Backend initiates an asynchronous download process

2. **Video Download**:
   - Uses yt-dlp to download the video to a temporary location
   - Supports various platforms (YouTube, Vimeo, TikTok, Instagram, etc.)
   - Configures format (MP4) and size limits

3. **Storage Upload**:
   - Uploads the downloaded video to Supabase storage
   - Updates the database record with status and public URL
   - Cleans up temporary files

4. **Status Tracking**:
   - Updates database with download progress: `processing`, `downloading`, `uploading`, `completed`, or `error`
   - Stores error messages when issues occur

### Frontend Integration

1. **User Interface**:
   - User enters a URL in the create page
   - UI shows download progress and status
   
2. **Status Polling**:
   - Frontend polls the API to check download status
   - Updates the UI based on the current status
   - Handles success and error cases

## Troubleshooting

Common issues and solutions:

- **Download fails**: Check if yt-dlp is correctly installed and in PATH
- **Permission errors**: Ensure proper permissions for temporary directories and Supabase storage
- **Unsupported URL**: yt-dlp may not support some platforms; check compatibility
- **Timeout issues**: Large videos may take longer to download; consider increasing timeouts

## Limitations

- **File Size**: Currently limited to 50MB to prevent storage issues with Supabase
- **Platform Support**: Limited to platforms supported by yt-dlp
- **Processing Time**: No progress reporting during download, just status updates