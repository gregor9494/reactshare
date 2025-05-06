# Video Download Implementation

This document describes the implementation of video downloading functionality in ReactShare, which uses the `yt-dlp` library to download videos from various platforms.

## Architecture Overview

The video download system consists of the following components:

1. **API Endpoint** (`app/api/videos/download/route.ts`): Handles requests to download videos from supported platforms
2. **Database Schema** (`source_videos` table): Stores metadata and status of video downloads
3. **Storage Integration** (Supabase Storage): Stores the downloaded video files
4. **yt-dlp Integration**: Uses the powerful yt-dlp utility to handle downloads from multiple platforms

## Workflow

1. User submits a URL to download
2. API validates the URL and creates a database record with status `processing`
3. System fetches metadata about the video (title, duration, platform)
4. Download process begins asynchronously
5. User can check download status via GET endpoint
6. When complete, video is available in Supabase storage

## Key Features

- **Platform Support**: Downloads from 20+ platforms including YouTube, TikTok, Instagram, Twitter, etc.
- **Robust Error Handling**: Multiple fallback mechanisms to handle platform-specific issues
- **Progress Tracking**: Records download progress and performance metrics
- **Metadata Extraction**: Retrieves useful metadata like title, platform, and duration
- **Efficient Storage**: Uses temporary storage for processing before uploading to permanent storage

## Download Stages

Videos go through the following stages during processing:

1. **Processing**: Initial state when request is received
2. **Downloading**: Video is being downloaded from the source platform
3. **Uploading**: Video is being uploaded to Supabase storage
4. **Completed**: Video is successfully downloaded and stored
5. **Error**: An error occurred during the process

## Error Handling Strategy

The system implements a multi-layered error handling approach:

1. **Format Fallbacks**: If the preferred format is unavailable, falls back to simpler formats
2. **Platform-Specific Handling**: Custom error handling for different platforms
3. **Geo-restriction Bypassing**: Attempts to bypass geo-restrictions when possible
4. **Detailed Error Messages**: Provides specific error messages for better debugging

## Database Schema

The `source_videos` table includes:

- `id`: Unique identifier for the download
- `user_id`: User who requested the download
- `url`: Original URL of the video
- `status`: Current status of the download
- `storage_path`: Path in Supabase storage
- `public_url`: Public URL to access the video
- `title`: Title of the video
- `platform`: Platform the video was downloaded from
- `duration`: Duration of the video in seconds
- `error_message`: Error message if download failed
- `download_progress`: Progress percentage (0-100)
- `processing_time_seconds`: Time taken to download and process
- `completed_at`: Timestamp when processing completed

## Configuration

The system uses several environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`: Supabase instance URL
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key for storage access

## Testing and Debugging

A test script is included in `scripts/test-yt-dlp.js` to verify yt-dlp functionality with any URL:

```bash
node scripts/test-yt-dlp.js https://www.youtube.com/watch?v=dQw4w9WgXcQ
```

## Limitations

- Maximum file size is limited to 50MB to ensure compatibility with Supabase storage
- Some platforms may implement anti-scraping measures that prevent downloads
- Processing time varies based on video length and platform responsiveness

## Future Improvements

- Implement webhook notifications when downloads complete
- Add support for audio-only downloads
- Support for playlists and multiple downloads
- Advanced transcoding options
- Scheduled downloads with retry mechanisms