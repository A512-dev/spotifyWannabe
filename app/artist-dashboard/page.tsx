"use client";

import { useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader, StatCard } from "@/components/shared";
import { Badge, Button, Card, Input, Select, Table, Textarea, type TableColumn } from "@/components/ui";
import { albums as mockAlbums } from "@/data/albums";
import { artists } from "@/data/artists";
import { artistRevenueRecords } from "@/data/financial-records";
import { tracks as mockTracks } from "@/data/tracks";
import { formatCurrencyFromCents, formatDate, formatDuration, formatNumber } from "@/lib/formatters";
import { useAuth } from "@/providers";
import type { Track } from "@/types/domain";

type ReleaseType = "single" | "album";

interface AlbumTrackDraft {
  id: string;
  title: string;
  audioFileName: string;
  lyrics: string;
  existingTrackId?: string;
}

interface DraftRelease {
  title: string;
  releaseType: ReleaseType;
  genre: string;
  releaseYear: string;
  collaborators: string;
  lyrics: string;
  coverFileName: string;
  audioFileName: string;
  albumTracks: AlbumTrackDraft[];
}

interface ManagedTrack extends Track {
  localStatus: "published" | "draft";
  genre?: string;
  lyrics?: string;
  collaborators?: string;
  albumTitle?: string;
}

interface CatalogReleaseGroup {
  id: string;
  releaseType: ReleaseType;
  title: string;
  tracks: ManagedTrack[];
  genre?: string;
  releaseDate: string;
}

const ACCEPTED_AUDIO_FORMATS = ["mp3", "wav", "flac"];

function createAlbumTrackDraft(
  index = 1,
  fileName = "",
  existingTrackId?: string,
  title?: string,
  lyrics = ""
): AlbumTrackDraft {
  return {
    id: existingTrackId ? `edit-${existingTrackId}` : `album-track-${Date.now()}-${index}`,
    title: title ?? (fileName ? getFileNameWithoutExtension(fileName) : ""),
    audioFileName: fileName,
    lyrics,
    existingTrackId
  };
}

function createInitialDraft(): DraftRelease {
  return {
    title: "",
    releaseType: "single",
    genre: "Pop",
    releaseYear: "2026",
    collaborators: "",
    lyrics: "",
    coverFileName: "",
    audioFileName: "",
    albumTracks: [createAlbumTrackDraft()]
  };
}

function getFileNameWithoutExtension(fileName: string) {
  return fileName.replace(/\.[^/.]+$/, "").replace(/[-_]+/g, " ").trim();
}

function getFileNameFromUrl(url?: string) {
  if (!url) {
    return "";
  }

  return decodeURIComponent(url.split("/").pop() ?? "");
}

function getUpdatedMediaUrl(fileName: string, previousUrl?: string) {
  if (!fileName) {
    return previousUrl;
  }

  if (previousUrl && getFileNameFromUrl(previousUrl) === fileName) {
    return previousUrl;
  }

  return `/mock/uploads/${fileName}`;
}

function isAcceptedAudioFile(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase();

  return Boolean(extension && ACCEPTED_AUDIO_FORMATS.includes(extension));
}

function createSingleDraftTrack(input: DraftRelease, artistId: string): ManagedTrack {
  return {
    id: `local-track-${Date.now()}`,
    title: input.title.trim(),
    artistId,
    durationSeconds: 0,
    audioUrl: input.audioFileName ? `/mock/uploads/${input.audioFileName}` : "",
    coverImageUrl: input.coverFileName ? `/mock/uploads/${input.coverFileName}` : undefined,
    playCount: 0,
    explicit: false,
    releaseDate: `${input.releaseYear || new Date().getFullYear()}-01-01T00:00:00.000Z`,
    localStatus: "draft",
    genre: input.genre,
    lyrics: input.lyrics.trim(),
    collaborators: input.collaborators.trim()
  };
}

function createAlbumDraftTrack(
  input: DraftRelease,
  albumTrack: AlbumTrackDraft,
  artistId: string,
  albumId: string,
  index: number
): ManagedTrack {
  const trackTitle = albumTrack.title.trim() || `${input.title.trim()} - Track ${index + 1}`;

  return {
    id: `${albumId}-track-${index + 1}`,
    title: trackTitle,
    artistId,
    albumId,
    durationSeconds: 0,
    audioUrl: albumTrack.audioFileName ? `/mock/uploads/${albumTrack.audioFileName}` : "",
    coverImageUrl: input.coverFileName ? `/mock/uploads/${input.coverFileName}` : undefined,
    playCount: 0,
    explicit: false,
    releaseDate: `${input.releaseYear || new Date().getFullYear()}-01-01T00:00:00.000Z`,
    localStatus: "draft",
    genre: input.genre,
    lyrics: albumTrack.lyrics.trim(),
    collaborators: input.collaborators.trim(),
    albumTitle: input.title.trim()
  };
}

export default function ArtistDashboardPage() {
  const { currentUser } = useAuth();

  const currentArtist = useMemo(
    () => artists.find((artist) => artist.id === currentUser?.artistProfileId) ?? null,
    [currentUser?.artistProfileId]
  );

  const [managedTracks, setManagedTracks] = useState<ManagedTrack[]>(() =>
    mockTracks.map((track) => ({ ...track, localStatus: "published" }))
  );

  const [draft, setDraft] = useState<DraftRelease>(() => createInitialDraft());
  const [formMessage, setFormMessage] = useState<string>("");
  const [editingReleaseId, setEditingReleaseId] = useState<string | null>(null);

  const artistTracks = useMemo(() => {
    if (!currentArtist) {
      return [];
    }

    return managedTracks.filter((track) => track.artistId === currentArtist.id);
  }, [currentArtist, managedTracks]);

  const artistAlbums = useMemo(() => {
    if (!currentArtist) {
      return [];
    }

    return mockAlbums.filter((album) => album.artistId === currentArtist.id);
  }, [currentArtist]);

  const catalogReleaseGroups = useMemo<CatalogReleaseGroup[]>(() => {
    const albumGroups = new Map<string, CatalogReleaseGroup>();
    const orderedGroups: CatalogReleaseGroup[] = [];

    artistTracks.forEach((track) => {
      if (track.albumId) {
        const mockAlbum = mockAlbums.find((album) => album.id === track.albumId);
        const albumTitle = track.albumTitle ?? mockAlbum?.title ?? "Untitled album";
        const existingGroup = albumGroups.get(track.albumId);

        if (existingGroup) {
          existingGroup.tracks.push(track);
          return;
        }

        const newAlbumGroup: CatalogReleaseGroup = {
          id: track.albumId,
          releaseType: "album",
          title: albumTitle,
          tracks: [track],
          genre: track.genre,
          releaseDate: track.releaseDate
        };

        albumGroups.set(track.albumId, newAlbumGroup);
        orderedGroups.push(newAlbumGroup);
        return;
      }

      orderedGroups.push({
        id: track.id,
        releaseType: "single",
        title: track.title,
        tracks: [track],
        genre: track.genre,
        releaseDate: track.releaseDate
      });
    });

    return orderedGroups;
  }, [artistTracks]);

  const artistRevenue = useMemo(() => {
    if (!currentArtist) {
      return [];
    }

    return artistRevenueRecords.filter((record) => record.artistId === currentArtist.id);
  }, [currentArtist]);

  const totalStreams = artistTracks.reduce((sum, track) => sum + track.playCount, 0);
  const totalRevenueCents = artistRevenue.reduce((sum, record) => sum + record.netRevenueCents, 0);
  const existingArtistAlbumIds = new Set(artistAlbums.map((album) => album.id));
  const localAlbumIds = artistTracks.reduce<string[]>((albumIds, track) => {
    if (track.albumId && !existingArtistAlbumIds.has(track.albumId)) {
      albumIds.push(track.albumId);
    }

    return albumIds;
  }, []);
  const localAlbumCount = new Set(localAlbumIds).size;
  const canManageCatalog = currentArtist?.approvalStatus === "approved";

  const updateDraft = (key: keyof DraftRelease, value: string | AlbumTrackDraft[]) => {
    setDraft((currentDraft) => ({ ...currentDraft, [key]: value }));
  };

  const handleReleaseTypeChange = (releaseType: ReleaseType) => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      releaseType,
      albumTracks: currentDraft.albumTracks.length > 0 ? currentDraft.albumTracks : [createAlbumTrackDraft()]
    }));
    setFormMessage("");
  };

  const handleAudioFileChange = (fileName: string) => {
    updateDraft("audioFileName", fileName);

    if (fileName && !isAcceptedAudioFile(fileName)) {
      setFormMessage("Audio file must be MP3, WAV, or FLAC.");
      return;
    }

    setFormMessage("");
  };

  const handleAlbumFilesChange = (files: FileList | null) => {
    const fileNames = Array.from(files ?? []).map((file) => file.name);

    if (fileNames.length === 0) {
      return;
    }

    const invalidFile = fileNames.find((fileName) => !isAcceptedAudioFile(fileName));

    if (invalidFile) {
      setFormMessage(`${invalidFile} is not supported. Album tracks must be MP3, WAV, or FLAC.`);
      return;
    }

    setDraft((currentDraft) => ({
      ...currentDraft,
      albumTracks: fileNames.map((fileName, index) => createAlbumTrackDraft(index + 1, fileName))
    }));
    setFormMessage(`${fileNames.length} album track${fileNames.length > 1 ? "s" : ""} selected.`);
  };

  const handleAlbumTrackChange = (trackId: string, key: keyof AlbumTrackDraft, value: string) => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      albumTracks: currentDraft.albumTracks.map((track) => (track.id === trackId ? { ...track, [key]: value } : track))
    }));
  };

  const handleAlbumTrackFileChange = (trackId: string, fileName: string) => {
    handleAlbumTrackChange(trackId, "audioFileName", fileName);

    if (fileName && !isAcceptedAudioFile(fileName)) {
      setFormMessage("Album track files must be MP3, WAV, or FLAC.");
      return;
    }

    setFormMessage("");
  };

  const handleAddAlbumTrack = () => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      albumTracks: [...currentDraft.albumTracks, createAlbumTrackDraft(currentDraft.albumTracks.length + 1)]
    }));
  };

  const handleRemoveAlbumTrack = (trackId: string) => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      albumTracks:
        currentDraft.albumTracks.length === 1
          ? [createAlbumTrackDraft()]
          : currentDraft.albumTracks.filter((track) => track.id !== trackId)
    }));
  };

  const replaceReleaseTracks = (oldTrackIds: string[], updatedTracks: ManagedTrack[]) => {
    const oldTrackIdSet = new Set(oldTrackIds);

    setManagedTracks((currentTracks) => {
      const nextTracks: ManagedTrack[] = [];
      let insertedUpdatedRelease = false;

      currentTracks.forEach((track) => {
        if (oldTrackIdSet.has(track.id)) {
          if (!insertedUpdatedRelease) {
            nextTracks.push(...updatedTracks);
            insertedUpdatedRelease = true;
          }

          return;
        }

        nextTracks.push(track);
      });

      if (!insertedUpdatedRelease) {
        return [...updatedTracks, ...currentTracks];
      }

      return nextTracks;
    });
  };

  const handleStartEditRelease = (release: CatalogReleaseGroup) => {
    const firstTrack = release.tracks[0];

    if (!firstTrack) {
      return;
    }

    setEditingReleaseId(release.id);

    setDraft({
      title: release.releaseType === "album" ? release.title : firstTrack.title,
      releaseType: release.releaseType,
      genre: release.genre ?? firstTrack.genre ?? "Pop",
      releaseYear: new Date(firstTrack.releaseDate).getFullYear().toString(),
      collaborators: firstTrack.collaborators ?? "",
      lyrics: release.releaseType === "single" ? firstTrack.lyrics ?? "" : "",
      coverFileName: "",
      audioFileName: release.releaseType === "single" ? getFileNameFromUrl(firstTrack.audioUrl) : "",
      albumTracks:
        release.releaseType === "album"
          ? release.tracks.map((track, index) =>
              createAlbumTrackDraft(index + 1, getFileNameFromUrl(track.audioUrl), track.id, track.title, track.lyrics ?? "")
            )
          : [createAlbumTrackDraft()]
    });

    setFormMessage(`Editing ${release.releaseType}: ${release.title}`);
  };

  const handleCancelEdit = () => {
    setEditingReleaseId(null);
    setDraft(createInitialDraft());
    setFormMessage("");
  };

  const handleSaveEditedRelease = () => {
    if (!editingReleaseId || !currentArtist) {
      return;
    }

    const release = catalogReleaseGroups.find((catalogRelease) => catalogRelease.id === editingReleaseId);

    if (!release) {
      setFormMessage("Selected release was not found.");
      return;
    }

    if (!draft.title.trim()) {
      setFormMessage(draft.releaseType === "album" ? "Album title is required." : "Release title is required.");
      return;
    }

    const normalizedReleaseDate = `${draft.releaseYear || new Date().getFullYear()}-01-01T00:00:00.000Z`;
    const oldTrackIds = release.tracks.map((track) => track.id);

    if (release.releaseType === "single") {
      const existingTrack = release.tracks[0];

      if (!existingTrack) {
        setFormMessage("Selected single was not found.");
        return;
      }

      if (!draft.audioFileName || !isAcceptedAudioFile(draft.audioFileName)) {
        setFormMessage("Please select a valid MP3, WAV, or FLAC audio file.");
        return;
      }

      const updatedSingle: ManagedTrack = {
        ...existingTrack,
        title: draft.title.trim(),
        genre: draft.genre,
        lyrics: draft.lyrics.trim(),
        collaborators: draft.collaborators.trim(),
        releaseDate: normalizedReleaseDate,
        audioUrl: getUpdatedMediaUrl(draft.audioFileName, existingTrack.audioUrl) ?? existingTrack.audioUrl,
        coverImageUrl: getUpdatedMediaUrl(draft.coverFileName, existingTrack.coverImageUrl)
      };

      replaceReleaseTracks(oldTrackIds, [updatedSingle]);
      setEditingReleaseId(null);
      setDraft(createInitialDraft());
      setFormMessage("Single release was updated.");
      return;
    }

    const activeAlbumTracks = draft.albumTracks.filter((track) => track.title.trim() || track.audioFileName);

    if (activeAlbumTracks.length < 2) {
      setFormMessage("Album releases need at least two tracks.");
      return;
    }

    const incompleteTrack = activeAlbumTracks.find((track) => !track.title.trim() || !track.audioFileName);

    if (incompleteTrack) {
      setFormMessage("Each album track needs both a title and a valid audio file.");
      return;
    }

    const invalidTrack = activeAlbumTracks.find((track) => !isAcceptedAudioFile(track.audioFileName));

    if (invalidTrack) {
      setFormMessage("Each album track file must be MP3, WAV, or FLAC.");
      return;
    }

    const previousTracksById = new Map(release.tracks.map((track) => [track.id, track]));

    const updatedAlbumTracks: ManagedTrack[] = activeAlbumTracks.map((albumTrack, index) => {
      const previousTrack = albumTrack.existingTrackId ? previousTracksById.get(albumTrack.existingTrackId) : undefined;

      return {
        id: previousTrack?.id ?? `${editingReleaseId}-track-${Date.now()}-${index + 1}`,
        title: albumTrack.title.trim(),
        artistId: currentArtist.id,
        albumId: editingReleaseId,
        durationSeconds: previousTrack?.durationSeconds ?? 0,
        audioUrl: getUpdatedMediaUrl(albumTrack.audioFileName, previousTrack?.audioUrl) ?? `/mock/uploads/${albumTrack.audioFileName}`,
        coverImageUrl: getUpdatedMediaUrl(draft.coverFileName, previousTrack?.coverImageUrl),
        playCount: previousTrack?.playCount ?? 0,
        explicit: previousTrack?.explicit ?? false,
        releaseDate: normalizedReleaseDate,
        localStatus: previousTrack?.localStatus ?? "draft",
        genre: draft.genre,
        lyrics: albumTrack.lyrics.trim(),
        collaborators: draft.collaborators.trim(),
        albumTitle: draft.title.trim()
      };
    });

    replaceReleaseTracks(oldTrackIds, updatedAlbumTracks);
    setEditingReleaseId(null);
    setDraft(createInitialDraft());
    setFormMessage("Album release was updated.");
  };

  const handleCreateDraft = () => {
    if (!currentArtist) {
      setFormMessage("No artist profile is linked to this account.");
      return;
    }

    if (!canManageCatalog) {
      setFormMessage("Your artist account must be approved before you can manage releases.");
      return;
    }

    if (!draft.title.trim()) {
      setFormMessage(draft.releaseType === "album" ? "Album title is required." : "Release title is required.");
      return;
    }

    if (draft.releaseType === "single") {
      if (!draft.audioFileName || !isAcceptedAudioFile(draft.audioFileName)) {
        setFormMessage("Please select a valid MP3, WAV, or FLAC audio file.");
        return;
      }

      setManagedTracks((currentTracks) => [createSingleDraftTrack(draft, currentArtist.id), ...currentTracks]);
      setDraft(createInitialDraft());
      setFormMessage("Single draft was added locally for Phase 1 review.");
      return;
    }

    const activeAlbumTracks = draft.albumTracks.filter((track) => track.title.trim() || track.audioFileName);

    if (activeAlbumTracks.length < 2) {
      setFormMessage("Album releases need at least two tracks. Select multiple files or add track rows manually.");
      return;
    }

    const incompleteTrack = activeAlbumTracks.find((track) => !track.title.trim() || !track.audioFileName);

    if (incompleteTrack) {
      setFormMessage("Each album track needs both a title and a valid audio file.");
      return;
    }

    const invalidTrack = activeAlbumTracks.find((track) => !isAcceptedAudioFile(track.audioFileName));

    if (invalidTrack) {
      setFormMessage("Each album track file must be MP3, WAV, or FLAC.");
      return;
    }

    const albumId = `local-album-${Date.now()}`;
    const albumDraftTracks = activeAlbumTracks.map((track, index) =>
      createAlbumDraftTrack(draft, track, currentArtist.id, albumId, index)
    );

    setManagedTracks((currentTracks) => [...albumDraftTracks, ...currentTracks]);
    setDraft(createInitialDraft());
    setFormMessage(`${albumDraftTracks.length} album tracks were added locally as an album draft.`);
  };

  const handlePublishRelease = (trackIds: string[]) => {
    setManagedTracks((currentTracks) =>
      currentTracks.map((track) => (trackIds.includes(track.id) ? { ...track, localStatus: "published" } : track))
    );
  };

  const handleDeleteRelease = (trackIds: string[]) => {
    setManagedTracks((currentTracks) => currentTracks.filter((track) => !trackIds.includes(track.id)));

    if (editingReleaseId) {
      const editingRelease = catalogReleaseGroups.find((release) => release.id === editingReleaseId);
      const editingTrackIds = editingRelease?.tracks.map((track) => track.id) ?? [];

      if (editingTrackIds.some((trackId) => trackIds.includes(trackId))) {
        handleCancelEdit();
      }
    }
  };

  const revenueColumns: TableColumn<(typeof artistRevenueRecords)[number]>[] = [
    {
      key: "period",
      header: "Period",
      render: (record) => `${formatDate(record.periodStart)} - ${formatDate(record.periodEnd)}`
    },
    {
      key: "streams",
      header: "Streams",
      render: (record) => formatNumber(record.streamCount)
    },
    {
      key: "gross",
      header: "Gross revenue",
      render: (record) => formatCurrencyFromCents(record.grossRevenueCents, record.currency)
    },
    {
      key: "platformFee",
      header: "Platform fee",
      render: (record) => formatCurrencyFromCents(record.platformFeeCents, record.currency)
    },
    {
      key: "net",
      header: "Artist payout",
      render: (record) => formatCurrencyFromCents(record.netRevenueCents, record.currency)
    }
  ];

  if (!currentUser) {
    return <DashboardLayout eyebrow="Artist workspace">Loading artist workspace...</DashboardLayout>;
  }

  return (
    <DashboardLayout eyebrow="Artist workspace">
      <PageHeader
        description="Manage releases, review catalog performance, and track artist revenue in the Phase 1 mock workspace."
        title="Artist Dashboard"
      />

      {!currentArtist ? (
        <Card className="mt-6 border-yellow-500/30 bg-yellow-500/10">
          <h2 className="text-lg font-semibold text-yellow-100">No artist profile linked</h2>
          <p className="mt-2 text-sm text-yellow-100/80">
            This account does not have an artist profile yet. Artist registration and approval are handled from the signup and support flows.
          </p>
        </Card>
      ) : null}

      {currentArtist ? (
        <>
          <section className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <Card>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-2xl font-semibold text-slate-50">{currentArtist.stageName}</h2>
                    {currentArtist.approvalStatus === "approved" ? <Badge tone="success">Verified artist</Badge> : null}
                    {currentArtist.approvalStatus !== "approved" ? <Badge tone="warning">{currentArtist.approvalStatus}</Badge> : null}
                  </div>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">{currentArtist.bio}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {currentArtist.genreTags.map((genre) => (
                      <Badge key={genre}>{genre}</Badge>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border border-surface-600 bg-surface-900 px-4 py-3 text-sm text-slate-300">
                  <p className="text-slate-400">Approval status</p>
                  <p className="mt-1 font-medium capitalize text-slate-50">{currentArtist.approvalStatus}</p>
                </div>
              </div>
            </Card>

            <Card>
              <h2 className="text-lg font-semibold text-slate-50">Release permissions</h2>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                Approved artists can create singles and albums, upload audio files, add lyrics, enter metadata, and review their own performance data.
              </p>
              {!canManageCatalog ? (
                <p className="mt-3 rounded-md border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-100">
                  Catalog management is locked until support or admin approves this artist account.
                </p>
              ) : null}
            </Card>
          </section>

          <section className="mt-6 grid gap-4 md:grid-cols-4">
            <StatCard label="Monthly listeners" value={formatNumber(currentArtist.monthlyListeners)} />
            <StatCard label="Total streams" value={formatNumber(totalStreams)} />
            <StatCard label="Published albums" value={formatNumber(artistAlbums.length + localAlbumCount)} />
            <StatCard label="Estimated payout" value={formatCurrencyFromCents(totalRevenueCents, artistRevenue[0]?.currency ?? "USD")} />
          </section>

          <section className="mt-6 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
            <Card>
              <h2 className="text-lg font-semibold text-slate-50">
                {editingReleaseId ? "Edit release" : "Create release draft"}
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                {editingReleaseId
                  ? "Update this release metadata, track list, lyrics, and media placeholders."
                  : "Phase 1 stores this draft in local component state. Backend upload and media storage will replace this flow in Phase 2."}
              </p>

              <div className="mt-5 space-y-4">
                <Input
                  disabled={!canManageCatalog}
                  label={draft.releaseType === "album" ? "Album title" : "Release title"}
                  name="title"
                  onChange={(event) => updateDraft("title", event.target.value)}
                  placeholder={draft.releaseType === "album" ? "Example: Midnight Signal EP" : "Example: Midnight Signal"}
                  value={draft.title}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <Select
                    disabled={!canManageCatalog || Boolean(editingReleaseId)}
                    label="Release type"
                    name="releaseType"
                    onChange={(event) => handleReleaseTypeChange(event.target.value as ReleaseType)}
                    options={[
                      { label: "Single", value: "single" },
                      { label: "Album", value: "album" }
                    ]}
                    value={draft.releaseType}
                  />
                  <Input
                    disabled={!canManageCatalog}
                    label="Release year"
                    name="releaseYear"
                    onChange={(event) => updateDraft("releaseYear", event.target.value)}
                    value={draft.releaseYear}
                  />
                </div>

                <Input
                  disabled={!canManageCatalog}
                  label="Genre"
                  name="genre"
                  onChange={(event) => updateDraft("genre", event.target.value)}
                  value={draft.genre}
                />

                <Input
                  disabled={!canManageCatalog}
                  helperText="Enter names separated by commas."
                  label="Collaborating artists"
                  name="collaborators"
                  onChange={(event) => updateDraft("collaborators", event.target.value)}
                  placeholder="Example: Nova Vale, DJ North"
                  value={draft.collaborators}
                />

                {draft.releaseType === "single" ? (
                  <>
                    <Input
                      accept="audio/mpeg,audio/wav,audio/flac,.mp3,.wav,.flac"
                      disabled={!canManageCatalog}
                      helperText="Supported formats: MP3, WAV, FLAC."
                      label="Audio file"
                      name="audioFile"
                      onChange={(event) => handleAudioFileChange(event.target.files?.[0]?.name ?? "")}
                      type="file"
                    />

                    <Textarea
                      disabled={!canManageCatalog}
                      label="Lyrics"
                      name="lyrics"
                      onChange={(event) => updateDraft("lyrics", event.target.value)}
                      placeholder="Paste lyrics here if available."
                      value={draft.lyrics}
                    />
                  </>
                ) : (
                  <div className="rounded-xl border border-surface-600 bg-surface-900/70 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="font-semibold text-slate-50">Album tracks</h3>
                        <p className="mt-1 text-xs leading-5 text-slate-400">
                          Select multiple files at once, then adjust each track title or lyrics before adding the album draft.
                        </p>
                      </div>
                      <Button disabled={!canManageCatalog} onClick={handleAddAlbumTrack} size="sm" type="button" variant="secondary">
                        Add track row
                      </Button>
                    </div>

                    <div className="mt-4">
                      <Input
                        accept="audio/mpeg,audio/wav,audio/flac,.mp3,.wav,.flac"
                        disabled={!canManageCatalog}
                        helperText="You can select several MP3, WAV, or FLAC files here."
                        label="Album audio files"
                        multiple
                        name="albumAudioFiles"
                        onChange={(event) => handleAlbumFilesChange(event.target.files)}
                        type="file"
                      />
                    </div>

                    <div className="mt-4 space-y-4">
                      {draft.albumTracks.map((albumTrack, index) => (
                        <div key={albumTrack.id} className="rounded-lg border border-surface-700 bg-surface-800/70 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-slate-100">Track {index + 1}</p>
                            <Button
                              disabled={!canManageCatalog}
                              onClick={() => handleRemoveAlbumTrack(albumTrack.id)}
                              size="sm"
                              type="button"
                              variant="danger"
                            >
                              Remove
                            </Button>
                          </div>

                          <div className="mt-4 grid gap-4 sm:grid-cols-2">
                            <Input
                              disabled={!canManageCatalog}
                              label="Track title"
                              name={`albumTrackTitle-${albumTrack.id}`}
                              onChange={(event) => handleAlbumTrackChange(albumTrack.id, "title", event.target.value)}
                              placeholder={`Track ${index + 1} title`}
                              value={albumTrack.title}
                            />
                            <Input
                              accept="audio/mpeg,audio/wav,audio/flac,.mp3,.wav,.flac"
                              disabled={!canManageCatalog}
                              helperText={albumTrack.audioFileName ? `Selected: ${albumTrack.audioFileName}` : "Choose a file for this track."}
                              label="Track audio file"
                              name={`albumTrackAudio-${albumTrack.id}`}
                              onChange={(event) => handleAlbumTrackFileChange(albumTrack.id, event.target.files?.[0]?.name ?? "")}
                              type="file"
                            />
                          </div>

                          <Textarea
                            className="mt-4"
                            disabled={!canManageCatalog}
                            label="Track lyrics"
                            name={`albumTrackLyrics-${albumTrack.id}`}
                            onChange={(event) => handleAlbumTrackChange(albumTrack.id, "lyrics", event.target.value)}
                            placeholder="Optional lyrics for this track."
                            value={albumTrack.lyrics}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Input
                  accept="image/*"
                  disabled={!canManageCatalog}
                  helperText="Used as the cover image for a single or album."
                  label="Cover image"
                  name="coverImage"
                  onChange={(event) => updateDraft("coverFileName", event.target.files?.[0]?.name ?? "")}
                  type="file"
                />

                {formMessage ? <p className="text-sm text-brand-500">{formMessage}</p> : null}

                <div className="flex flex-wrap gap-2">
                  <Button disabled={!canManageCatalog} onClick={editingReleaseId ? handleSaveEditedRelease : handleCreateDraft}>
                    {editingReleaseId ? "Save changes" : "Add draft release"}
                  </Button>

                  {editingReleaseId ? (
                    <Button onClick={handleCancelEdit} type="button" variant="secondary">
                      Cancel edit
                    </Button>
                  ) : null}
                </div>
              </div>
            </Card>

            <Card>
              <h2 className="text-lg font-semibold text-slate-50">Catalog management</h2>
              <p className="mt-2 text-sm text-slate-400">
                Artists can review, publish, or remove their own releases. Albums are grouped so each release is easier to manage.
              </p>

              <div className="mt-5">
                {catalogReleaseGroups.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-surface-600 bg-surface-900/60 p-6 text-center text-sm text-slate-400">
                    No releases found for this artist.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {catalogReleaseGroups.map((release) => {
                      const isAlbum = release.releaseType === "album";
                      const releaseStatus = release.tracks.some((track) => track.localStatus === "draft") ? "draft" : "published";
                      const releaseStreams = release.tracks.reduce((sum, track) => sum + track.playCount, 0);
                      const releaseDurationSeconds = release.tracks.reduce((sum, track) => sum + track.durationSeconds, 0);
                      const releaseTrackIds = release.tracks.map((track) => track.id);

                      return (
                        <div key={release.id} className="rounded-xl border border-surface-700 bg-surface-900/70 p-4">
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge>{isAlbum ? "Album" : "Single"}</Badge>
                                <Badge tone={releaseStatus === "published" ? "success" : "warning"}>{releaseStatus}</Badge>
                              </div>

                              <h3 className="mt-3 text-lg font-semibold text-slate-50">{release.title}</h3>

                              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                                <span>{isAlbum ? `${release.tracks.length} tracks` : "1 track"}</span>
                                <span>{release.genre ?? "Genre not set"}</span>
                                <span>{formatNumber(releaseStreams)} streams</span>
                                <span>{releaseDurationSeconds > 0 ? formatDuration(releaseDurationSeconds) : "Not processed"}</span>
                                <span>{formatDate(release.releaseDate)}</span>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <Button onClick={() => handleStartEditRelease(release)} size="sm" variant="secondary">
                                Edit
                              </Button>

                              <Button
                                disabled={releaseStatus === "published"}
                                onClick={() => handlePublishRelease(releaseTrackIds)}
                                size="sm"
                                variant="secondary"
                              >
                                {isAlbum ? "Publish album" : "Publish"}
                              </Button>

                              <Button onClick={() => handleDeleteRelease(releaseTrackIds)} size="sm" variant="danger">
                                {isAlbum ? "Delete album" : "Delete"}
                              </Button>
                            </div>
                          </div>

                          <div className="mt-4 overflow-hidden rounded-lg border border-surface-700">
                            <div className="grid grid-cols-[0.6fr_2fr_1fr_1fr] gap-3 bg-surface-800 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                              <span>#</span>
                              <span>Track</span>
                              <span>Status</span>
                              <span>Streams</span>
                            </div>

                            <div className="divide-y divide-surface-700">
                              {release.tracks.map((track, index) => (
                                <div
                                  key={track.id}
                                  className="grid grid-cols-[0.6fr_2fr_1fr_1fr] gap-3 px-3 py-3 text-sm text-slate-200"
                                >
                                  <span className="text-slate-400">{String(index + 1).padStart(2, "0")}</span>
                                  <div>
                                    <p className="font-medium text-slate-50">{track.title}</p>
                                    <p className="mt-1 text-xs text-slate-500">
                                      {track.durationSeconds > 0 ? formatDuration(track.durationSeconds) : "Not processed"}
                                    </p>
                                  </div>
                                  <span>
                                    <Badge tone={track.localStatus === "published" ? "success" : "warning"}>{track.localStatus}</Badge>
                                  </span>
                                  <span>{formatNumber(track.playCount)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </Card>
          </section>

          <section className="mt-6">
            <Card>
              <h2 className="text-lg font-semibold text-slate-50">Monthly revenue reports</h2>
              <p className="mt-2 text-sm text-slate-400">
                Revenue is shown from backend-ready mock records. Phase 2 should compute these aggregates in Django, not in the browser.
              </p>
              <div className="mt-5">
                <Table
                  columns={revenueColumns}
                  emptyMessage="No revenue records are available yet."
                  getRowKey={(record) => record.id}
                  rows={artistRevenue}
                />
              </div>
            </Card>
          </section>
        </>
      ) : null}
    </DashboardLayout>
  );
}