"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { AiMusic } from "@/lib/types";

interface VideoCreationFormProps {
  musicItem: AiMusic;
  onVideoCreated: (updatedMusic: AiMusic) => void;
}

export function VideoCreationForm({ musicItem, onVideoCreated }: VideoCreationFormProps) {
  const [logoUrl, setLogoUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await fetch("/api/ai-music/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ musicId: musicItem.id, logoUrl }),
      });

      if (!response.ok) {
        throw new Error("Failed to create video");
      }

      const updatedMusic = await response.json();
      onVideoCreated(updatedMusic);
      toast({
        title: "Success",
        description: "Video created successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create video. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 mt-2">
      <Input
        type="text"
        placeholder="Enter logo URL..."
        value={logoUrl}
        onChange={(e) => setLogoUrl(e.target.value)}
        disabled={isLoading}
        className="w-full"
      />
      <Button type="submit" disabled={isLoading}>
        {isLoading ? "Creating..." : "Create Video"}
      </Button>
    </form>
  );
}