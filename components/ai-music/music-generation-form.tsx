"use client";

import { useState, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";
import { AiMusic } from "@/lib/types";
import { Textarea } from "@/components/ui/textarea";

interface MusicGenerationFormProps {
  onMusicGenerated: (music: AiMusic) => void;
}

export function MusicGenerationForm({ onMusicGenerated }: MusicGenerationFormProps) {
  const [prompt, setPrompt] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!prompt) {
      toast({
        title: "Error",
        description: "Prompt is required.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const generateResponse = await fetch("/api/ai-music/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, lyrics }),
      });

      if (!generateResponse.ok) {
        throw new Error("Failed to start music generation");
      }

      const { taskId } = await generateResponse.json();

      const poll = async () => {
        const queryResponse = await fetch(`/api/ai-music/query/${taskId}`);
        const data = await queryResponse.json();

        if (data.status === 'succeeded') {
          const songUrl = data.choices[0].url;
          const supabase = createSupabaseBrowserClient();
          const { data: newMusic, error } = await supabase
            .from('ai_music')
            .insert([
              { prompt, lyrics, song_url: songUrl },
            ])
            .select()
            .single();
          
          if (error) throw error;

          onMusicGenerated(newMusic);
          setPrompt("");
          setLyrics("");
          toast({
            title: "Success",
            description: "Music generated successfully.",
          });
          setIsLoading(false);
        } else if (data.status === 'failed' || data.status === 'timeouted' || data.status === 'cancelled') {
          throw new Error(`Music generation failed: ${data.failed_reason}`);
        } else {
          setTimeout(poll, 5000);
        }
      };

      poll();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate music. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        type="text"
        placeholder="Enter a prompt to generate music..."
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        disabled={isLoading}
      />
      <Textarea
        placeholder="Enter lyrics here..."
        value={lyrics}
        onChange={(e) => setLyrics(e.target.value)}
        disabled={isLoading}
        className="min-h-[150px]"
      />
      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? "Generating..." : "Generate"}
      </Button>
    </form>
  );
}