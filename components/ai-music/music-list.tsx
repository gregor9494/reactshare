"use client";

import { VideoCreationForm } from "./video-creation-form";
import { AiMusic } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

interface MusicListProps {
  music: AiMusic[];
  onVideoCreated: (updatedMusic: AiMusic) => void;
}

export function MusicList({ music, onVideoCreated }: MusicListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Generated Music</CardTitle>
        <CardDescription>
          Listen to the music you have generated.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {music.map((item) => (
            <div key={item.id} className="p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{item.prompt}</p>
                  <audio controls className="w-full mt-2">
                    <source src={item.song_url} type="audio/mpeg" />
                    Your browser does not support the audio element.
                  </audio>
                </div>
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
                  <div className="text-sm text-gray-500">No video yet</div>
                )}
              </div>
              {item.lyrics && (
                <Accordion type="single" collapsible className="w-full mt-2">
                  <AccordionItem value="item-1">
                    <AccordionTrigger>View Lyrics</AccordionTrigger>
                    <AccordionContent>
                      <pre className="whitespace-pre-wrap">{item.lyrics}</pre>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              )}
              {item.video_id ? (
                <div className="mt-4">
                  <video width="100%" controls>
                    <source src={`/api/videos/play?path=${item.video_id}`} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                </div>
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