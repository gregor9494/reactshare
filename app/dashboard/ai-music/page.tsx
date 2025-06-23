"use client";

import { useEffect, useState } from "react";
import { MusicGenerationForm } from "@/components/ai-music/music-generation-form";
import { MusicList } from "@/components/ai-music/music-list";
import { AiMusic } from "@/lib/types";

export default function AiMusicPage() {
  const [music, setMusic] = useState<AiMusic[]>([]);

  useEffect(() => {
    async function fetchMusic() {
      const response = await fetch("/api/ai-music");
      const data = await response.json();
      setMusic(data);
    }
    fetchMusic();
  }, []);

  const handleMusicGenerated = (newMusic: AiMusic) => {
    setMusic((prevMusic) => [newMusic, ...prevMusic]);
  };

  const handleVideoCreated = (updatedMusic: AiMusic) => {
    setMusic((prevMusic) =>
      prevMusic.map((item) =>
        item.id === updatedMusic.id ? updatedMusic : item
      )
    );
  };

  return (
    <div className="space-y-4 pt-6">
      <MusicGenerationForm onMusicGenerated={handleMusicGenerated} />
      <MusicList music={music} onVideoCreated={handleVideoCreated} />
    </div>
  );
}