"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useProgress } from "@/hooks/useProgress";
import { Select } from "@/components/ui/Select";
import { Label } from "@/components/ui/Field";

interface AudioPlayerProps {
  src: string;
  lessonId: number;
  title: string;
}

const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5, 2];
const SEEK_OFFSET = 5; // seconds

export function AudioPlayer({ src, lessonId, title }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const { getProgress, savePosition } = useProgress();

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [hasError, setHasError] = useState(false);

  // Restore position on mount
  useEffect(() => {
    if (!audioRef.current) return;

    const progress = getProgress(lessonId);
    if (progress && progress.positionSeconds > 0) {
      audioRef.current.currentTime = progress.positionSeconds;
    }
  }, [lessonId, getProgress]);

  // Handle timeupdate to save progress (throttled)
  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      savePosition(lessonId, audioRef.current.currentTime);
    }
  }, [lessonId, savePosition]);

  // Handle metadata loaded
  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  // Handle play/pause
  const handlePlayPause = () => {
    if (!audioRef.current) return;
    if (audioRef.current.paused) {
      audioRef.current.play();
      setIsPlaying(true);
    } else {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLAudioElement>) => {
    if (!audioRef.current) return;

    if (e.code === "Space") {
      e.preventDefault();
      handlePlayPause();
    } else if (e.code === "ArrowRight") {
      audioRef.current.currentTime = Math.min(
        audioRef.current.currentTime + SEEK_OFFSET,
        audioRef.current.duration,
      );
    } else if (e.code === "ArrowLeft") {
      audioRef.current.currentTime = Math.max(
        audioRef.current.currentTime - SEEK_OFFSET,
        0,
      );
    }
  };

  // Handle playback rate change
  const handlePlaybackRateChange = (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const rate = parseFloat(e.target.value);
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  // Handle audio error
  const handleError = () => {
    setHasError(true);
    setIsPlaying(false);
  };

  const formatTime = (seconds: number): string => {
    if (!Number.isFinite(seconds)) return "0:00";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="rounded-lg border border-border bg-surface-card p-6 space-y-4">
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
        onError={handleError}
        onKeyDown={handleKeyDown}
        aria-label={title}
        tabIndex={0}
      />

      {hasError && (
        <div
          className="p-4 bg-error/10 border border-error rounded text-error text-sm"
          role="alert"
        >
          Audio could not be loaded - Internet Archive may be temporarily
          unavailable.
        </div>
      )}

      {!hasError && (
        <>
          {/* Playback Controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={handlePlayPause}
              className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary text-white hover:bg-primary-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label={isPlaying ? "إيقاف التشغيل" : "تشغيل"}
            >
              {isPlaying ? (
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            {/* Time Display */}
            <div className="flex-1 min-w-0">
              <div className="w-full bg-border rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{
                    width:
                      duration > 0
                        ? `${(currentTime / duration) * 100}%`
                        : "0%",
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-text-secondary mt-1">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
          </div>

          {/* Playback Rate Control */}
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Label htmlFor="playback-rate" className="text-xs">
                سرعة التشغيل
              </Label>
              <Select
                id="playback-rate"
                value={playbackRate}
                onChange={handlePlaybackRateChange}
                className="mt-1"
              >
                {PLAYBACK_RATES.map((rate) => (
                  <option key={rate} value={rate}>
                    {rate}x
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {/* Keyboard Help */}
          <p className="text-xs text-text-secondary text-center">
            المسافة: تشغيل/إيقاف | ← →: البحث ±5ث
          </p>
        </>
      )}
    </div>
  );
}
