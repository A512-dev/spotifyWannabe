"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { PlayerControlsPlaceholder } from "@/components/player/PlayerControlsPlaceholder";
import { PlayerTrackSummary } from "@/components/player/PlayerTrackSummary";
import { albums } from "@/data/albums";
import { artists } from "@/data/artists";
import { tracks } from "@/data/tracks";
import { useAuth } from "@/providers";
import { usePlayer } from "@/providers/PlayerProvider";
import { formatNumber, formatDuration } from "@/lib/formatters";
import type { Track } from "@/types/domain";

export function PlayerShell() {
  const { playerState, setPlayerState } = usePlayer();
  const { currentUser } = useAuth();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentTrack = tracks.find((track) => track.id === playerState.currentTrackId);
  const currentArtist = currentTrack ? artists.find((a) => a.id === currentTrack.artistId) : null;
  const currentAlbum = currentTrack ? albums.find((a) => a.id === currentTrack.albumId) : null;

  const [activeQueue, setActiveQueue] = useState<Track[]>(tracks);
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<"off" | "all" | "one">("off");
  const volume = playerState.volume ?? 100;

  useEffect(() => {
    setProgress(0);
    const queueJson = localStorage.getItem("soundwave_active_queue");
    if (queueJson) {
      try {
        const trackIds = JSON.parse(queueJson) as string[];
        const queueTracks = trackIds.map(id => tracks.find(t => t.id === id)).filter((t): t is Track => Boolean(t));
        setActiveQueue(queueTracks.length > 0 ? queueTracks : tracks);
      } catch {
        setActiveQueue(tracks);
      }
    } else {
      setActiveQueue(tracks);
    }
  }, [playerState.currentTrackId]);

  const handleNext = useCallback(() => {
    if (!currentTrack) return;
    let nextTrackId = currentTrack.id;

    if (shuffle) {
      const otherTracks = activeQueue.filter((t) => t.id !== currentTrack.id);
      const randomTrack = otherTracks[Math.floor(Math.random() * otherTracks.length)];
      nextTrackId = randomTrack?.id || currentTrack.id;
    } else {
      const currentIndex = activeQueue.findIndex((t) => t.id === currentTrack.id);
      if (currentIndex !== -1 && currentIndex < activeQueue.length - 1) {
        nextTrackId = activeQueue[currentIndex + 1].id;
      } else if (repeat === "all") {
        nextTrackId = activeQueue[0].id;
      } else {
        if (setPlayerState) {
          setPlayerState({ ...playerState, isPlaying: false, currentTrackId: activeQueue[0].id });
        }
        setProgress(0);
        return;
      }
    }

    if (setPlayerState) {
      setPlayerState({ ...playerState, currentTrackId: nextTrackId, isPlaying: true });
    }
  }, [currentTrack, shuffle, repeat, playerState, setPlayerState, activeQueue]);

  const handlePrevious = useCallback(() => {
    if (!currentTrack || !setPlayerState) return;
    
    if (progress > 3) {
      setProgress(0);
      return;
    }
    
    const currentIndex = activeQueue.findIndex((t) => t.id === currentTrack.id);
    if (currentIndex > 0) {
      setPlayerState({ ...playerState, currentTrackId: activeQueue[currentIndex - 1].id, isPlaying: true });
    } else if (repeat === "all") {
      setPlayerState({ ...playerState, currentTrackId: activeQueue[activeQueue.length - 1].id, isPlaying: true });
    } else {
      setProgress(0);
    }
  }, [currentTrack, progress, repeat, playerState, setPlayerState, activeQueue]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;
    audio.load();
    setProgress(0);
  }, [currentTrack]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (playerState.isPlaying) {
      void audio.play().catch(() => {
        setPlayerState({ ...playerState, isPlaying: false });
      });
      return;
    }
    audio.pause();
  }, [playerState, setPlayerState]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = Math.min(Math.max(volume / 100, 0), 1);
    }
  }, [volume]);

  if (!currentTrack) return null;

  const togglePlayPause = () => {
    if (setPlayerState) {
      setPlayerState({ ...playerState, isPlaying: !playerState.isPlaying });
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    if (setPlayerState) {
      setPlayerState({ ...playerState, volume: newVolume });
    }
  };

  const handleSeek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
    setProgress(time);
  };

  const handleAudioEnded = () => {
    if (repeat === "one" && audioRef.current) {
      audioRef.current.currentTime = 0;
      void audioRef.current.play();
      return;
    }
    handleNext();
  };

  const toggleRepeat = () => {
    if (repeat === "off") setRepeat("all");
    else if (repeat === "all") setRepeat("one");
    else setRepeat("off");
  };

  const currentIdx = activeQueue.findIndex(t => t.id === currentTrack.id);
  const upcomingTracks = activeQueue.slice(currentIdx + 1, currentIdx + 6); 
  const isGoldUser = currentUser?.subscriptionTier === "gold";

  return (
    <>
      <audio
        onEnded={handleAudioEnded}
        onTimeUpdate={(event) => setProgress(Math.floor(event.currentTarget.currentTime))}
        ref={audioRef}
        src={currentTrack.audioUrl}
      />
      
      {/* نوار پایین ثابت */}
      <footer className="fixed bottom-[70px] md:bottom-0 left-0 right-0 z-40 border-t border-white/5 bg-white/[0.04] px-4 py-3.5 backdrop-blur-xl shadow-[0_-4px_24px_rgba(0,0,0,0.4)] text-white transition-all duration-300">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4 relative">
          
          <div className="flex items-center justify-between w-full sm:w-[30%] gap-4">
            {/* اطلاعات آهنگ (در گوشی کلیک روی این بخش پلیر تمام‌صفحه را باز می‌کند) */}
            <div 
              className="flex min-w-0 flex-1 cursor-pointer"
              onClick={() => setIsMobileExpanded(true)}
            >
              <PlayerTrackSummary track={currentTrack} />
            </div>

            {/* کنترلرهای ساده مینی‌پلیر موبایل (بدون نوار پخش) */}
            <div className="flex items-center gap-2 sm:hidden shrink-0">
              <button onClick={togglePlayPause} className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#1a0b2e] shadow hover:scale-105 transition-transform">
                {playerState.isPlaying ? (
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 16 16"><path d="M2.7 1a.7.7 0 0 0-.7.7v12.6a.7.7 0 0 0 .7.7h2.6a.7.7 0 0 0 .7-.7V1.7a.7.7 0 0 0-.7-.7H2.7zm8 0a.7.7 0 0 0-.7.7v12.6a.7.7 0 0 0 .7.7h2.6a.7.7 0 0 0 .7-.7V1.7a.7.7 0 0 0-.7-.7h-2.6z"/></svg>
                ) : (
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 16 16"><path d="M3 1.713a.7.7 0 0 1 .1.05l10.89 6.288a.7.7 0 0 1 0 1.212L4.05 14.894A.7.7 0 0 1 3 14.288V1.713z"/></svg>
                )}
              </button>
              <button onClick={handleNext} className="flex h-9 w-9 items-center justify-center text-white/80 hover:text-white transition-colors">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 16 16"><path d="M12.7 1a.7.7 0 0 0-.7.7v5.15L2.05 1.106A.7.7 0 0 0 1 1.713v12.575a.7.7 0 0 0 1.05.607L12 9.149V14.3a.7.7 0 0 0 1.4 0V1.7a.7.7 0 0 0-.7-.7z"/></svg>
              </button>
            </div>
          </div>

          {/* کنترلرهای دسکتاپ به همراه نوار پخش داخلیِ خود کامپوننت */}
          <div className="hidden sm:flex flex-1 items-center justify-center gap-4 px-4">
            <PlayerControlsPlaceholder 
              duration={currentTrack.durationSeconds}
              isPlaying={playerState.isPlaying} 
              onNext={handleNext}
              onPlayPause={togglePlayPause}
              onPrevious={handlePrevious}
              onRepeatToggle={toggleRepeat}
              onSeek={handleSeek}
              onShuffleToggle={() => setShuffle(!shuffle)}
              progress={progress}
              repeat={repeat}
              shuffle={shuffle}
            />
          </div>

          <div className="hidden w-[30%] items-center justify-end gap-3 sm:flex relative">
            <button 
              className={`transition-colors ${isQueueOpen ? 'text-brand-secondary' : 'text-white/60 hover:text-white'}`}
              onClick={() => setIsQueueOpen(!isQueueOpen)}
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 16 16">
                <path d="M15 15H1v-1.5h14V15zm0-4.5H1V9h14v1.5zm-14-7A2.5 2.5 0 0 1 3.5 1h9a2.5 2.5 0 0 1 0 5h-9A2.5 2.5 0 0 1 1 3.5zm2.5-1a1 1 0 0 0 0 2h9a1 1 0 1 0 0-2h-9z" />
              </svg>
            </button>
            <div className="group flex items-center">
              <input 
                className="h-1.5 w-24 cursor-pointer appearance-none rounded-full bg-white/10 accent-white transition-all group-hover:accent-brand-secondary" 
                max="100" 
                min="0"
                onChange={(e) => handleVolumeChange(Number(e.target.value))}
                type="range"
                value={volume} 
              />
            </div>

            {isQueueOpen && (
              <div className="absolute bottom-[calc(100%+1rem)] right-0 w-80 rounded-xl border border-white/10 bg-[#1a0b2e]/95 p-4 shadow-2xl backdrop-blur-xl text-white">
                <h3 className="mb-4 text-xs font-bold text-white/50 uppercase tracking-wider">Next In Queue</h3>
                <div className="flex flex-col gap-2">
                  {upcomingTracks.length > 0 ? upcomingTracks.map(t => {
                    const tArtist = artists.find(a => a.id === t.artistId);
                    return (
                      <div className="flex items-center gap-3 cursor-pointer hover:bg-white/10 p-2 rounded-lg transition-colors" key={t.id} onClick={() => setPlayerState?.({ ...playerState, currentTrackId: t.id, isPlaying: true })}>
                        <img alt={t.title} className="h-10 w-10 rounded-md object-cover shadow-sm" src={t.coverImageUrl || ""} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-white">{t.title}</p>
                          <p className="truncate text-[10px] text-white/60 uppercase mt-0.5">{tArtist?.stageName || "Unknown"}</p>
                        </div>
                      </div>
                    );
                  }) : (
                    <p className="text-sm text-white/40 italic text-center py-2">No upcoming tracks.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </footer>

      {/* پلیر تمام‌صفحه اختصاصی موبایل (Expanded View) */}
      {isMobileExpanded && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#160926]/95 p-6 backdrop-blur-3xl sm:hidden text-white">
          <div className="mb-8 flex items-center justify-between">
            <button className="text-white/70 hover:text-white" onClick={() => setIsMobileExpanded(false)}>
              <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z" />
              </svg>
            </button>
            <span className="text-xs font-bold uppercase tracking-widest text-white/40">Now Playing</span>
            <div className="w-6 h-6" /> 
          </div>

          <div className="flex flex-1 flex-col justify-center gap-8 max-w-sm mx-auto w-full">
            <div className="aspect-square w-full overflow-hidden rounded-3xl bg-white/5 shadow-2xl border border-white/10">
              {currentTrack.coverImageUrl ? (
                <img alt={currentTrack.title} className="h-full w-full object-cover" src={currentTrack.coverImageUrl} />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-white/20">Cover</div>
              )}
            </div>

            <div className="text-center">
              <h2 className="truncate text-2xl font-black text-white">{currentTrack.title}</h2>
              <div className="flex items-center justify-center gap-2 text-sm text-white/60 mt-2">
                {currentArtist ? (
                  <Link 
                    className="truncate hover:text-white hover:underline" 
                    href={`/artist/${currentTrack.artistId}`}
                    onClick={() => setIsMobileExpanded(false)}
                  >
                    {currentArtist.stageName}
                  </Link>
                ) : (
                  <p className="truncate">Unknown Artist</p>
                )}
              </div>
            </div>

            <div className="w-full flex flex-col gap-6 mt-2">
              {/* نوار پخش انحصاری برای صفحه بزرگ موبایل */}
              <div className="flex w-full items-center gap-3">
                <span className="w-10 text-right text-xs text-white/60 font-semibold">{formatDuration(progress)}</span>
                <input
                  className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-white/20 accent-white transition-all focus:outline-none"
                  max={currentTrack.durationSeconds}
                  min="0"
                  onChange={(e) => handleSeek(Number(e.target.value))}
                  type="range"
                  value={progress}
                />
                <span className="w-10 text-left text-xs text-white/60 font-semibold">{formatDuration(currentTrack.durationSeconds)}</span>
              </div>

              {/* دکمه‌های کنترل موسیقی */}
              <PlayerControlsPlaceholder 
                duration={currentTrack.durationSeconds}
                isPlaying={playerState.isPlaying} 
                onNext={handleNext}
                onPlayPause={togglePlayPause}
                onPrevious={handlePrevious}
                onRepeatToggle={toggleRepeat}
                onSeek={handleSeek}
                onShuffleToggle={() => setShuffle(!shuffle)}
                progress={progress}
                repeat={repeat}
                shuffle={shuffle}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}