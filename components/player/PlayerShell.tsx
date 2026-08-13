"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { PlayerControlsPlaceholder } from "@/components/player/PlayerControlsPlaceholder";
import { PlayerTrackSummary } from "@/components/player/PlayerTrackSummary";
import { musicApi } from "@/features/music/api";
import { ApiError } from "@/lib/api";
import { usePlayer } from "@/providers/PlayerProvider";
import { useUserPreferences } from "@/providers/UserPreferencesProvider";
import type { Track } from "@/types/domain";

const QUEUE_STORAGE_KEY = "soundwave_active_queue";

export function PlayerShell() {
  const { playerState, setPlayerState, tracks } = usePlayer();
  const { t } = useUserPreferences();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamSessionRef = useRef("");
  const streamStartedRef = useRef(false);
  const streamRequestPendingRef = useRef(false);
  const lastStreamReportRef = useRef(0);
  const currentTrack = tracks.find((track) => track.id === playerState.currentTrackId);

  const [activeQueue, setActiveQueue] = useState<Track[]>([]);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [playerError, setPlayerError] = useState("");
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isLyricsOpen, setIsLyricsOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<"off" | "all" | "one">("off");
  const touchStartYRef = useRef<number | null>(null);
  const volume = playerState.volume ?? 100;

  const persistQueue = useCallback((queue: Track[]) => {
    setActiveQueue(queue);
    const ids = queue.map((track) => track.id);
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(ids));
    setPlayerState((state) => ({ ...state, queueTrackIds: ids }));
  }, [setPlayerState]);

  useEffect(() => {
    let queueIds = playerState.queueTrackIds;
    if (queueIds.length === 0) {
      try {
        queueIds = JSON.parse(localStorage.getItem(QUEUE_STORAGE_KEY) ?? "[]") as string[];
      } catch {
        queueIds = [];
      }
    }
    const byId = new Map(tracks.map((track) => [track.id, track]));
    const queue = queueIds.map((id) => byId.get(id)).filter((track): track is Track => Boolean(track));
    if (currentTrack && !queue.some((track) => track.id === currentTrack.id)) queue.unshift(currentTrack);
    setActiveQueue(queue.length > 0 ? queue : tracks);
  }, [currentTrack, playerState.queueTrackIds, tracks]);

  useEffect(() => {
    let active = true;
    setProgress(0);
    setPlayerError("");
    setStreamUrl(null);
    setIsLyricsOpen(false);
    streamSessionRef.current = `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    streamStartedRef.current = false;
    streamRequestPendingRef.current = false;
    lastStreamReportRef.current = 0;

    if (!currentTrack) return () => { active = false; };
    void musicApi.playback(currentTrack.id)
      .then(({ streamUrl: authorizedUrl }) => {
        if (active) setStreamUrl(authorizedUrl);
      })
      .catch((error) => {
        if (!active) return;
        setPlayerError(error instanceof ApiError ? error.message : t("This track could not be opened."));
        setPlayerState((state) => ({ ...state, isPlaying: false }));
      });
    return () => { active = false; };
  }, [currentTrack, setPlayerState, t]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.load();
  }, [streamUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !streamUrl) return;

    let cancelled = false;

    if (playerState.isPlaying) {
      void audio.play()
        .then(() => {
          if (!cancelled) setPlayerError("");
        })
        .catch((error: unknown) => {
          if (
            cancelled ||
            (error instanceof DOMException && error.name === "AbortError")
          ) {
            return;
          }

          setPlayerError(
            t("Playback could not start. Try selecting the track again.")
          );
          setPlayerState((state) => ({ ...state, isPlaying: false }));
        });
    } else {
      audio.pause();
    }

    return () => {
      cancelled = true;
    };
  }, [playerState.isPlaying, setPlayerState, streamUrl, t]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = Math.min(Math.max(volume / 100, 0), 1);
  }, [volume]);

  const handleNext = useCallback(() => {
    if (!currentTrack || activeQueue.length === 0) return;
    const currentIndex = activeQueue.findIndex((track) => track.id === currentTrack.id);
    let next: Track | undefined;
    if (shuffle) {
      const choices = activeQueue.filter((track) => track.id !== currentTrack.id);
      next = choices[Math.floor(Math.random() * choices.length)];
    } else if (currentIndex >= 0 && currentIndex < activeQueue.length - 1) {
      next = activeQueue[currentIndex + 1];
    } else if (repeat === "all") {
      next = activeQueue[0];
    }
    if (!next) {
      setPlayerState((state) => ({ ...state, isPlaying: false }));
      setProgress(0);
      return;
    }
    setPlayerState((state) => ({ ...state, currentTrackId: next.id, isPlaying: true }));
  }, [activeQueue, currentTrack, repeat, setPlayerState, shuffle]);

  const handlePrevious = useCallback(() => {
    if (!currentTrack || activeQueue.length === 0) return;
    if (progress > 3) {
      if (audioRef.current) audioRef.current.currentTime = 0;
      setProgress(0);
      return;
    }
    const currentIndex = activeQueue.findIndex((track) => track.id === currentTrack.id);
    const previous = currentIndex > 0
      ? activeQueue[currentIndex - 1]
      : repeat === "all" ? activeQueue.at(-1) : undefined;
    if (previous) setPlayerState((state) => ({ ...state, currentTrackId: previous.id, isPlaying: true }));
  }, [activeQueue, currentTrack, progress, repeat, setPlayerState]);

  const reportStreamError = useCallback((error: unknown, sessionId: string) => {
    if (streamSessionRef.current !== sessionId) return;
    if (error instanceof ApiError && error.status === 403) {
      audioRef.current?.pause();
      setPlayerError(error.message);
      setPlayerState((state) => ({ ...state, isPlaying: false }));
    }
  }, [setPlayerState]);

  const reportStream = (seconds: number, force = false) => {
    if (!currentTrack || streamRequestPendingRef.current) return;
    const reportedSeconds = Math.max(0, Math.floor(seconds));
    const sessionId = streamSessionRef.current;
    if (!streamStartedRef.current) {
      streamStartedRef.current = true;
      streamRequestPendingRef.current = true;
      void musicApi.registerStream(currentTrack.id, sessionId, 0)
        .catch((error) => {
          streamStartedRef.current = false;
          reportStreamError(error, sessionId);
        })
        .finally(() => { streamRequestPendingRef.current = false; });
      return;
    }
    if (!force && reportedSeconds - lastStreamReportRef.current < 10) return;
    streamRequestPendingRef.current = true;
    void musicApi.registerStream(currentTrack.id, sessionId, reportedSeconds)
      .then(() => { lastStreamReportRef.current = reportedSeconds; })
      .catch((error) => reportStreamError(error, sessionId))
      .finally(() => { streamRequestPendingRef.current = false; });
  };

  const moveQueueTrack = (trackId: string, offset: -1 | 1) => {
    const from = activeQueue.findIndex((track) => track.id === trackId);
    const to = from + offset;
    if (from < 0 || to < 0 || to >= activeQueue.length) return;
    const next = [...activeQueue];
    [next[from], next[to]] = [next[to], next[from]];
    persistQueue(next);
  };

  const removeQueueTrack = (trackId: string) => {
    const index = activeQueue.findIndex((track) => track.id === trackId);
    if (index < 0) return;
    const next = activeQueue.filter((track) => track.id !== trackId);
    persistQueue(next);
    if (currentTrack?.id === trackId) {
      const replacement = next[Math.min(index, Math.max(next.length - 1, 0))];
      setPlayerState((state) => ({
        ...state,
        currentTrackId: replacement?.id,
        isPlaying: Boolean(replacement),
      }));
    }
  };

  const queuePanel = (
    <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
      {activeQueue.map((track, index) => (
        <div className={`flex items-center gap-2 rounded-lg p-2 ${track.id === currentTrack?.id ? "bg-brand-secondary/15" : "hover:bg-white/10"}`} key={track.id}>
          <button className="min-w-0 flex-1 text-start" onClick={() => setPlayerState((state) => ({ ...state, currentTrackId: track.id, isPlaying: true }))} type="button">
            <p className="truncate text-sm font-bold text-white">{track.title}</p>
            <p className="truncate text-[10px] text-white/60">{track.artistName ?? t("Unknown artist")}</p>
          </button>
          <button aria-label={t("Move up")} className="px-1 text-white/60 disabled:opacity-25" disabled={index === 0} onClick={() => moveQueueTrack(track.id, -1)} type="button">↑</button>
          <button aria-label={t("Move down")} className="px-1 text-white/60 disabled:opacity-25" disabled={index === activeQueue.length - 1} onClick={() => moveQueueTrack(track.id, 1)} type="button">↓</button>
          <button aria-label={t("Remove from queue")} className="px-1 text-rose-300" onClick={() => removeQueueTrack(track.id)} type="button">×</button>
        </div>
      ))}
      {activeQueue.length === 0 ? <p className="py-2 text-center text-sm italic text-white/40">{t("Queue is empty.")}</p> : null}
    </div>
  );

  if (!currentTrack) return null;

  const togglePlayPause = () => setPlayerState((state) => ({ ...state, isPlaying: !state.isPlaying }));
  const handleSeek = (time: number) => {
    if (audioRef.current) audioRef.current.currentTime = time;
    setProgress(time);
  };
  const toggleRepeat = () => setRepeat((value) => value === "off" ? "all" : value === "all" ? "one" : "off");
  const dismissPlayer = () => {
    audioRef.current?.pause();
    setIsMobileExpanded(false);
    setPlayerState((state) => ({ ...state, currentTrackId: undefined, isPlaying: false }));
  };

  return (
    <>
      <audio
        onEnded={() => {
          reportStream(audioRef.current?.currentTime ?? currentTrack.durationSeconds, true);
          if (repeat === "one" && audioRef.current) {
            audioRef.current.currentTime = 0;
            void audioRef.current.play();
          } else handleNext();
        }}
        onError={() => streamUrl && setPlayerError(t("The protected audio stream could not be loaded."))}
        onPause={(event) => reportStream(event.currentTarget.currentTime, true)}
        onPlay={() => reportStream(0, true)}
        onTimeUpdate={(event) => {
          const seconds = Math.floor(event.currentTarget.currentTime);
          setProgress(seconds);
          reportStream(seconds);
        }}
        ref={audioRef}
        src={streamUrl ?? undefined}
      />

      <footer
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/5 bg-[#1a0b2e]/95 px-4 py-3 text-white shadow-[0_-4px_24px_rgba(0,0,0,0.4)] backdrop-blur-xl"
        onTouchEnd={(event) => {
          if (touchStartYRef.current !== null && event.changedTouches[0].clientY - touchStartYRef.current > 70) dismissPlayer();
          touchStartYRef.current = null;
        }}
        onTouchStart={(event) => { touchStartYRef.current = event.touches[0].clientY; }}
      >
        {playerError ? <p className="mx-auto mb-2 max-w-7xl rounded-md bg-rose-500/15 px-3 py-1.5 text-xs text-rose-200">{playerError}</p> : null}
        <div className="relative mx-auto flex w-full max-w-7xl items-center justify-between gap-4">
          <button className="flex min-w-0 flex-1 text-start sm:w-[30%] sm:flex-none" onClick={() => setIsMobileExpanded(true)} type="button">
            <PlayerTrackSummary track={currentTrack} />
          </button>
          <div className="hidden flex-1 justify-center px-4 sm:flex">
            <PlayerControlsPlaceholder duration={currentTrack.durationSeconds} isPlaying={playerState.isPlaying} onNext={handleNext} onPlayPause={togglePlayPause} onPrevious={handlePrevious} onRepeatToggle={toggleRepeat} onSeek={handleSeek} onShuffleToggle={() => setShuffle((value) => !value)} progress={progress} repeat={repeat} shuffle={shuffle} />
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:w-[30%] sm:justify-end">
            <button className="sm:hidden" onClick={togglePlayPause} type="button">{t(playerState.isPlaying ? "Pause" : "Play")}</button>
            <button className="sm:hidden" onClick={handleNext} type="button">{t("Next")}</button>
            {currentTrack.lyrics ? <button className="hidden text-xs text-white/70 sm:block" onClick={() => { setIsLyricsOpen((value) => !value); setIsQueueOpen(false); }} type="button">{t("Lyrics")}</button> : null}
            <button className="hidden text-xs text-white/70 sm:block" onClick={() => { setIsQueueOpen((value) => !value); setIsLyricsOpen(false); }} type="button">{t("Queue")}</button>
            <input aria-label={t("Volume")} className="hidden w-24 accent-brand-secondary sm:block" max="100" min="0" onChange={(event) => setPlayerState((state) => ({ ...state, volume: Number(event.target.value) }))} type="range" value={volume} />
            <button aria-label={t("Close player")} className="grid h-8 w-8 place-items-center rounded-full text-lg text-white/70 hover:bg-white/10 hover:text-white" onClick={dismissPlayer} type="button">×</button>
            {isLyricsOpen && currentTrack.lyrics ? <div className="absolute bottom-[calc(100%+1rem)] right-0 max-h-80 w-80 overflow-y-auto rounded-xl border border-white/10 bg-[#160926]/95 p-4 text-sm whitespace-pre-line shadow-2xl">{currentTrack.lyrics}</div> : null}
            {isQueueOpen ? <div className="absolute bottom-[calc(100%+1rem)] right-0 w-96 max-w-[90vw] rounded-xl border border-white/10 bg-[#160926]/95 p-4 shadow-2xl"><h3 className="mb-3 text-xs font-bold uppercase text-white/50">{t("Playback queue")}</h3>{queuePanel}</div> : null}
          </div>
        </div>
      </footer>

      {isMobileExpanded ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#160926]/98 p-6 text-white backdrop-blur-3xl sm:hidden">
          <div className="mx-auto flex min-h-full max-w-sm flex-col gap-6">
            <div className="flex items-center justify-between"><button onClick={() => setIsMobileExpanded(false)} type="button">{t("Close")}</button><span className="text-xs uppercase text-white/50">{t("Now playing")}</span><button aria-label={t("Close player")} className="text-xl text-white/70" onClick={dismissPlayer} type="button">×</button></div>
            <div className="aspect-square overflow-hidden rounded-3xl bg-white/5">{currentTrack.coverImageUrl ? <img alt={currentTrack.title} className="h-full w-full object-cover" src={currentTrack.coverImageUrl} /> : null}</div>
            <div className="text-center">
              <h2 className="text-2xl font-black">{currentTrack.title}</h2>
              <p className="mt-2 text-sm text-white/60"><Link href={`/artist/${currentTrack.artistId}`}>{currentTrack.artistName ?? t("Unknown artist")}</Link>{currentTrack.albumId ? <> · <Link href={`/music/album/${currentTrack.albumId}`}>{currentTrack.albumTitle ?? t("Album")}</Link></> : null}</p>
            </div>
            <PlayerControlsPlaceholder duration={currentTrack.durationSeconds} isPlaying={playerState.isPlaying} onNext={handleNext} onPlayPause={togglePlayPause} onPrevious={handlePrevious} onRepeatToggle={toggleRepeat} onSeek={handleSeek} onShuffleToggle={() => setShuffle((value) => !value)} progress={progress} repeat={repeat} shuffle={shuffle} />
            <label className="flex items-center gap-3 text-sm text-white/70">{t("Volume")}<input className="flex-1 accent-brand-secondary" max="100" min="0" onChange={(event) => setPlayerState((state) => ({ ...state, volume: Number(event.target.value) }))} type="range" value={volume} /></label>
            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><h3 className="mb-3 text-xs font-bold uppercase text-white/50">{t("Playback queue")}</h3>{queuePanel}</section>
            {currentTrack.lyrics ? <section className="max-h-48 overflow-y-auto rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm whitespace-pre-line">{currentTrack.lyrics}</section> : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
