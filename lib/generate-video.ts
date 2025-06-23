import { AiMusic } from './types';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function generateVideo(music: AiMusic, songPath: string, logoPath: string, outputPath: string): Promise<string> {
  // This function will generate the video using FFmpeg.
  // It requires FFmpeg to be installed on the system.

  // 2. Generate the video with an equalizer and logo
  // This is a placeholder command. You will need to customize it based on your needs.
  const ffmpegCommand = `
    ffmpeg -y -i ${songPath} -loop 1 -i ${logoPath} \\
    -filter_complex "[0:a]showwaves=s=1280x720:mode=cline:colors=white|gray,colorkey=0x000000:0.1:0.1[v]; [1:v]scale=200:200,rotate=0:c=none[logo]; [v][logo]overlay=(W-w)/2:(H-h)/2" \\
    -c:v libx264 -preset veryfast -crf 18 -c:a aac -b:a 192k -shortest ${outputPath}
  `;

  try {
    console.log('Executing FFmpeg command:', ffmpegCommand);
    const { stdout, stderr } = await execAsync(ffmpegCommand);
    if (stderr) {
      console.error('FFmpeg stderr:', stderr);
    }
    console.log('FFmpeg stdout:', stdout);
    return outputPath;
  } catch (error) {
    console.error('Error generating video:', error);
    throw new Error('Failed to generate video.');
  }
}