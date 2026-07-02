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
import { formatNumber } from "@/lib/formatters";
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
        // تغییر مهم: به جای بستن پلیر، به آهنگ اول لیست برمی‌گردیم و پخش را متوقف می‌کنیم
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

    if (!audio || !currentTrack) {
      return;
    }

    audio.load();
    setProgress(0);
  }, [currentTrack]);

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

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
      <footer className="fixed bottom-0 left-0 right-0 z-40 border-t border-surface-700 bg-surface-900 px-2 py-2 shadow-player sm:px-4 sm:py-3">
        {/* تقارن ابعاد: سمت چپ 30٪، مرکز Flex-1، سمت راست 30٪ */}
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 relative">
          
          {/* سمت چپ: در موبایل کل عرض رو پر میکنه، در دسکتاپ دقیقا 30 درصد فضا میگیره */}
          <div 
            className="flex min-w-0 flex-1 cursor-pointer sm:w-[30%] sm:flex-none sm:cursor-default"
            onClick={() => setIsMobileExpanded(true)}
          >
            <PlayerTrackSummary track={currentTrack} />
          </div>

          {/* مرکز: فقط در دسکتاپ نمایش داده میشه و همیشه در مرکز ثابته */}
          <div className="hidden flex-1 justify-center sm:flex">
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

          {/* سمت راست: دقیقا برابر با سمت چپ (30 درصد) فضا میگیره تا مرکز به هم نریزه */}
          <div className="hidden w-[30%] items-center justify-end gap-3 sm:flex">
            <button 
              className={`transition-colors ${isQueueOpen ? 'text-green-500' : 'text-slate-400 hover:text-slate-50'}`}
              onClick={() => setIsQueueOpen(!isQueueOpen)}
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 16 16">
                <path d="M15 15H1v-1.5h14V15zm0-4.5H1V9h14v1.5zm-14-7A2.5 2.5 0 0 1 3.5 1h9a2.5 2.5 0 0 1 0 5h-9A2.5 2.5 0 0 1 1 3.5zm2.5-1a1 1 0 0 0 0 2h9a1 1 0 1 0 0-2h-9z" />
              </svg>
            </button>
            <button
              className="text-slate-400 transition-colors hover:text-slate-50"
              onClick={() => handleVolumeChange(volume === 0 ? 80 : 0)}
              title={volume === 0 ? "Unmute" : "Mute"}
              type="button"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 16 16">
                <path d="M9.741.85a.75.75 0 0 1 .375.65v13a.75.75 0 0 1-1.125.65l-6.925-4a3.642 3.642 0 0 1-1.33-4.967 3.639 3.639 0 0 1 1.33-1.332l6.925-4a.75.75 0 0 1 .75 0zm-6.924 5.3a2.139 2.139 0 0 0-1.042 1.85 2.14 2.14 0 0 0 1.042 1.851l6.425 3.71V1.85l-6.425 3.71z" />
                <path d="M13.5 3.25a.75.75 0 0 0-1.5 0v9.5a.75.75 0 0 0 1.5 0v-9.5z" />
              </svg>
            </button>
            <div className="group flex items-center">
              <input 
                className="h-1 w-24 cursor-pointer appearance-none rounded-full bg-surface-600 accent-white transition-all group-hover:accent-green-500" 
                max="100" 
                min="0"
                onChange={(e) => handleVolumeChange(Number(e.target.value))}
                type="range"
                value={volume} 
              />
            </div>
          </div>

          {/* مینی پلیر موبایل: فقط دکمه‌های کنترلی کوچک کنار مشخصات */}
          <div className="flex shrink-0 items-center sm:hidden">
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
              showExtraControls={false}
              shuffle={shuffle}
            />
          </div>

          {/* Queue Popover */}
          {isQueueOpen && (
            <div className="absolute bottom-[100%] right-0 mb-4 w-80 rounded-xl border border-surface-700 bg-surface-800 p-4 shadow-2xl">
              <h3 className="mb-4 text-sm font-bold text-slate-50">Next In Queue</h3>
              <div className="flex flex-col gap-3">
                {upcomingTracks.length > 0 ? upcomingTracks.map(t => {
                  const tArtist = artists.find(a => a.id === t.artistId);
                  return (
                    <div className="flex items-center gap-3 cursor-pointer hover:bg-surface-700 p-1 rounded transition-colors" key={t.id} onClick={() => setPlayerState?.({ ...playerState, currentTrackId: t.id, isPlaying: true })}>
                      <img alt={t.title} className="h-10 w-10 rounded object-cover" src={t.coverImageUrl || ""} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-50">{t.title}</p>
                        <p className="truncate text-xs text-slate-400">{tArtist?.stageName || "Unknown"}</p>
                      </div>
                    </div>
                  );
                }) : (
                  <p className="text-sm text-slate-400">No upcoming tracks.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </footer>

      {/* پلیر تمام صفحه موبایل */}
      {isMobileExpanded && (
        <div className="fixed inset-0 z-50 flex flex-col bg-surface-900 p-6 sm:hidden">
          <div className="mb-8 flex items-center justify-between">
            <button className="text-slate-50" onClick={() => setIsMobileExpanded(false)}>
              <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z" />
              </svg>
            </button>
            <span className="text-xs font-bold uppercase tracking-widest text-slate-50">Now Playing</span>
            <button className="text-slate-50">
              <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
              </svg>
            </button>
          </div>

          <div className="flex flex-1 flex-col justify-center gap-8">
            <div className="aspect-square w-full overflow-hidden rounded-xl bg-surface-700 shadow-2xl">
              {currentTrack.coverImageUrl ? (
                <img alt={currentTrack.title} className="h-full w-full object-cover" src={currentTrack.coverImageUrl} />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-slate-500">Cover</div>
              )}
            </div>

            <div>
              <h2 className="truncate text-2xl font-bold text-slate-50">{currentTrack.title}</h2>
              <div className="flex items-center gap-2 text-lg text-slate-400">
                {currentArtist ? (
                  <Link 
                    className="truncate hover:text-slate-300 hover:underline" 
                    href={`/artist/${currentTrack.artistId}`}
                    onClick={() => setIsMobileExpanded(false)}
                  >
                    {currentArtist.stageName}
                  </Link>
                ) : (
                  <p className="truncate">Unknown Artist</p>
                )}
                
                {currentAlbum && (
                  <>
                    <span className="text-sm">•</span>
                    <Link 
                      className="truncate hover:text-slate-300 hover:underline" 
                      href={`/music/album/${currentAlbum.id}`}
                      onClick={() => setIsMobileExpanded(false)}
                    >
                      {currentAlbum.title}
                    </Link>
                  </>
                )}
              </div>

              {isGoldUser && (
                <p className="mt-2 flex items-center gap-1 text-sm font-medium text-amber-500">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-7.5c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                  </svg>
                  {formatNumber(currentTrack.playCount)} streams
                </p>
              )}
            </div>

            <div className="w-full">
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
