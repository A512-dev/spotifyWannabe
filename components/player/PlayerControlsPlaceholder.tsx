"use client";

import { formatDuration } from "@/lib/formatters";

interface PlayerControlsProps {
  duration: number;
  progress: number;
  isPlaying: boolean;
  shuffle: boolean;
  repeat: "off" | "all" | "one";
  showExtraControls?: boolean;
  onPlayPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSeek: (time: number) => void;
  onShuffleToggle: () => void;
  onRepeatToggle: () => void;
}

export function PlayerControlsPlaceholder({
  duration,
  progress,
  isPlaying,
  shuffle,
  repeat,
  showExtraControls = true,
  onPlayPause,
  onNext,
  onPrevious,
  onSeek,
  onShuffleToggle,
  onRepeatToggle,
}: PlayerControlsProps) {
  return (
    <div className="flex max-w-[722px] flex-1 flex-col items-center justify-center gap-2">
      <div className="flex w-full items-center justify-between sm:w-auto sm:justify-center sm:gap-6">
        {/* Shuffle */}
        <button
          className={`h-8 w-8 items-center justify-center rounded-full transition-colors ${
            showExtraControls ? "flex" : "hidden sm:flex"
          } ${shuffle ? "text-brand-accent drop-shadow" : "text-white/70 hover:text-white"}`}
          onClick={onShuffleToggle}
        >
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 16 16">
            <path d="M13.151.922a.75.75 0 1 0-1.06 1.06L13.109 3H11.16a3.75 3.75 0 0 0-2.873 1.34l-6.173 7.356A2.25 2.25 0 0 1 .39 12.5H0V14h.391a3.75 3.75 0 0 0 2.873-1.34l6.173-7.356a2.25 2.25 0 0 1 1.724-.804h1.947l-1.017 1.018a.75.75 0 0 0 1.06 1.06L15.98 3.75 13.15.922zM.391 3.5H0V2h.391c.28 0 .532.14.678.369l1.638 2.56-1.26 1.512-1.056-1.651a2.25 2.25 0 0 0-1.724-.79H0z" />
            <path d="M15.98 12.25l-2.83-2.828a.75.75 0 1 0-1.06 1.06l1.017 1.018h-1.947a2.25 2.25 0 0 1-1.724-.804l-1.284-1.53-1.26 1.513 1.372 1.634a3.75 3.75 0 0 0 2.872 1.339h1.948l-1.018 1.017a.75.75 0 1 0 1.06 1.06l2.829-2.828z" />
          </svg>
        </button>

        {/* Previous */}
        <button
          className="flex h-8 w-8 items-center justify-center text-white/70 transition-colors hover:text-white"
          onClick={onPrevious}
        >
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 16 16">
            <path d="M3.3 1a.7.7 0 0 1 .7.7v5.15l9.95-5.744a.7.7 0 0 1 1.05.606v12.575a.7.7 0 0 1-1.05.607L4 9.149V14.3a.7.7 0 0 1-1.4 0V1.7a.7.7 0 0 1 .7-.7z" />
          </svg>
        </button>

        {/* Play/Pause */}
        <button
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-brand-primary transition-transform hover:scale-105 shadow-md sm:h-10 sm:w-10"
          onClick={onPlayPause}
        >
          {isPlaying ? (
            <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="currentColor" viewBox="0 0 16 16">
              <path d="M2.7 1a.7.7 0 0 0-.7.7v12.6a.7.7 0 0 0 .7.7h2.6a.7.7 0 0 0 .7-.7V1.7a.7.7 0 0 0-.7-.7H2.7zm8 0a.7.7 0 0 0-.7.7v12.6a.7.7 0 0 0 .7.7h2.6a.7.7 0 0 0 .7-.7V1.7a.7.7 0 0 0-.7-.7h-2.6z" />
            </svg>
          ) : (
            <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="currentColor" viewBox="0 0 16 16">
              <path d="M3 1.713a.7.7 0 0 1 1.05-.607l10.89 6.288a.7.7 0 0 1 0 1.212L4.05 14.894A.7.7 0 0 1 3 14.288V1.713z" />
            </svg>
          )}
        </button>

        {/* Next */}
        <button
          className="flex h-8 w-8 items-center justify-center text-white/70 transition-colors hover:text-white"
          onClick={onNext}
        >
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 16 16">
            <path d="M12.7 1a.7.7 0 0 0-.7.7v5.15L2.05 1.106A.7.7 0 0 0 1 1.713v12.575a.7.7 0 0 0 1.05.607L12 9.149V14.3a.7.7 0 0 0 1.4 0V1.7a.7.7 0 0 0-.7-.7z" />
          </svg>
        </button>

        {/* Repeat */}
        <button
          className={`h-8 w-8 items-center justify-center rounded-full transition-colors ${
            showExtraControls ? "flex" : "hidden sm:flex"
          } ${repeat !== "off" ? "text-brand-accent drop-shadow" : "text-white/70 hover:text-white"}`}
          onClick={onRepeatToggle}
          title={repeat === "off" ? "Enable repeat" : repeat === "all" ? "Enable repeat one" : "Disable repeat"}
        >
          {repeat === "one" ? (
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 16 16">
              <path d="M0 4.75A3.75 3.75 0 0 1 3.75 1h8.5A3.75 3.75 0 0 1 16 4.75v5a3.75 3.75 0 0 1-3.75 3.75H9.81l1.018 1.018a.75.75 0 1 1-1.06 1.06L6.939 12.75l2.829-2.828a.75.75 0 1 1 1.06 1.06L9.811 12h2.439a2.25 2.25 0 0 0 2.25-2.25v-5a2.25 2.25 0 0 0-2.25-2.25h-8.5A2.25 2.25 0 0 0 1.5 4.75v5A2.25 2.25 0 0 0 3.75 12H5v1.5H3.75A3.75 3.75 0 0 1 0 9.75v-5z" />
              <path d="M8 8.5h-2v-4h1.5l1.5 1.5V8.5zM6.5 7V5.5L5.5 6.5V7h1z" />
            </svg>
          ) : (
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 16 16">
              <path d="M0 4.75A3.75 3.75 0 0 1 3.75 1h8.5A3.75 3.75 0 0 1 16 4.75v5a3.75 3.75 0 0 1-3.75 3.75H9.81l1.018 1.018a.75.75 0 1 1-1.06 1.06L6.939 12.75l2.829-2.828a.75.75 0 1 1 1.06 1.06L9.811 12h2.439a2.25 2.25 0 0 0 2.25-2.25v-5a2.25 2.25 0 0 0-2.25-2.25h-8.5A2.25 2.25 0 0 0 1.5 4.75v5A2.25 2.25 0 0 0 3.75 12H5v1.5H3.75A3.75 3.75 0 0 1 0 9.75v-5z" />
            </svg>
          )}
        </button>
      </div>

      <div className="group hidden w-full items-center gap-2 sm:flex">
        <span className="w-10 text-right text-xs text-white/80 font-medium">{formatDuration(progress)}</span>
        <input
          className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-brand-primary/40 accent-white transition-all group-hover:accent-brand-accent"
          max={duration}
          min="0"
          onChange={(e) => onSeek(Number(e.target.value))}
          type="range"
          value={progress}
        />
        <span className="w-10 text-left text-xs text-white/80 font-medium">{formatDuration(duration)}</span>
      </div>
    </div>
  );
}