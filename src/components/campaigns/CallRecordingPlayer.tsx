import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Pause, Download, Volume2 } from "lucide-react";

interface CallRecordingPlayerProps {
  recordingUrl: string;
  callSid?: string;
  duration?: number;
}

export function CallRecordingPlayer({
  recordingUrl,
  callSid,
  duration,
}: CallRecordingPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audio] = useState(new Audio(recordingUrl));

  const handlePlayPause = () => {
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = recordingUrl;
    link.download = `recording-${callSid || 'unknown'}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'Unknown';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Volume2 className="h-5 w-5" />
          Call Recording
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <Button
            size="icon"
            variant="outline"
            onClick={handlePlayPause}
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>

          <div className="flex-1">
            <audio
              ref={(el) => {
                if (el) {
                  el.onended = () => setIsPlaying(false);
                }
              }}
              src={recordingUrl}
              controls
              className="w-full"
            />
          </div>

          {duration && (
            <span className="text-sm text-muted-foreground">
              {formatDuration(duration)}
            </span>
          )}

          <Button
            size="icon"
            variant="ghost"
            onClick={handleDownload}
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
