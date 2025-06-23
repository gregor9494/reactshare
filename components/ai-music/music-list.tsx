"use client";

import { VideoCreationForm } from "./video-creation-form";
import { AudioPlayer } from "./audio-player";
import { AiMusic } from "@/lib/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface MusicListProps {
  music: AiMusic[];
  onVideoCreated: (updatedMusic: AiMusic) => void;
}

export function MusicList({ music, onVideoCreated }: MusicListProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Generated Music</CardTitle>
        <CardDescription>Listen to the music you have generated.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {music.map((item) => (
            <div key={item.id} className="w-full p-4 border rounded-lg space-y-4">
              <p className="font-medium">{item.prompt}</p>
              <AudioPlayer src={item.song_url} />
              <div className="flex items-center justify-between w-full">
                {item.video_id ? (
                  <a
                    href={`/api/videos/play?path=${item.video_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-green-500 hover:underline"
                  >
                    Video Ready
                  </a>
                ) : (
                  <span className="text-sm text-gray-500">No video yet</span>
                )}
              </div>
              {item.lyrics && (
                <Accordion type="single" collapsible>
                  <AccordionItem value={`lyrics-${item.id}`}>
                    <AccordionTrigger>View Lyrics</AccordionTrigger>
                    <AccordionContent>
                      <pre className="whitespace-pre-wrap">{item.lyrics}</pre>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              )}
              {item.video_id ? (
                <video className="w-full rounded-md" controls>
                  <source src={`/api/videos/play?path=${item.video_id}`} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              ) : (
                <VideoCreationForm musicItem={item} onVideoCreated={onVideoCreated} />
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}