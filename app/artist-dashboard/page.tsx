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

interface DraftRelease {
  title: string;
  releaseType: ReleaseType;
  genre: string;
  releaseYear: string;
  collaborators: string;
  lyrics: string;
  coverFileName: string;
  audioFileName: string;
}

interface ManagedTrack extends Track {
  localStatus: "published" | "draft";
  genre?: string;
  lyrics?: string;
  collaborators?: string;
}

const ACCEPTED_AUDIO_FORMATS = ["mp3", "wav", "flac"];

const initialDraft: DraftRelease = {
  title: "",
  releaseType: "single",
  genre: "Pop",
  releaseYear: "2026",
  collaborators: "",
  lyrics: "",
  coverFileName: "",
  audioFileName: ""
};

function isAcceptedAudioFile(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase();

  return Boolean(extension && ACCEPTED_AUDIO_FORMATS.includes(extension));
}

function createDraftTrack(input: DraftRelease, artistId: string): ManagedTrack {
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

export default function ArtistDashboardPage() {
  const { currentUser } = useAuth();

  const currentArtist = useMemo(
    () => artists.find((artist) => artist.id === currentUser?.artistProfileId) ?? null,
    [currentUser?.artistProfileId]
  );

  const [managedTracks, setManagedTracks] = useState<ManagedTrack[]>(() =>
    mockTracks.map((track) => ({ ...track, localStatus: "published" }))
  );

  const [draft, setDraft] = useState<DraftRelease>(initialDraft);
  const [formMessage, setFormMessage] = useState<string>("");

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

  const artistRevenue = useMemo(() => {
    if (!currentArtist) {
      return [];
    }

    return artistRevenueRecords.filter((record) => record.artistId === currentArtist.id);
  }, [currentArtist]);

  const totalStreams = artistTracks.reduce((sum, track) => sum + track.playCount, 0);
  const totalRevenueCents = artistRevenue.reduce((sum, record) => sum + record.netRevenueCents, 0);
  const canManageCatalog = currentArtist?.approvalStatus === "approved";

  const updateDraft = (key: keyof DraftRelease, value: string) => {
    setDraft((currentDraft) => ({ ...currentDraft, [key]: value }));
  };

  const handleAudioFileChange = (fileName: string) => {
    updateDraft("audioFileName", fileName);

    if (fileName && !isAcceptedAudioFile(fileName)) {
      setFormMessage("Audio file must be MP3, WAV, or FLAC.");
      return;
    }

    setFormMessage("");
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
      setFormMessage("Release title is required.");
      return;
    }

    if (!draft.audioFileName || !isAcceptedAudioFile(draft.audioFileName)) {
      setFormMessage("Please select a valid MP3, WAV, or FLAC audio file.");
      return;
    }

    setManagedTracks((currentTracks) => [createDraftTrack(draft, currentArtist.id), ...currentTracks]);
    setDraft(initialDraft);
    setFormMessage("Draft release was added locally for Phase 1 review.");
  };

  const handlePublishTrack = (trackId: string) => {
    setManagedTracks((currentTracks) =>
      currentTracks.map((track) => (track.id === trackId ? { ...track, localStatus: "published" } : track))
    );
  };

  const handleDeleteTrack = (trackId: string) => {
    setManagedTracks((currentTracks) => currentTracks.filter((track) => track.id !== trackId));
  };

  const catalogColumns: TableColumn<ManagedTrack>[] = [
    {
      key: "title",
      header: "Track",
      render: (track) => (
        <div>
          <p className="font-medium text-slate-50">{track.title}</p>
          <p className="text-xs text-slate-400">{track.genre ?? "Genre not set"}</p>
        </div>
      )
    },
    {
      key: "status",
      header: "Status",
      render: (track) => <Badge tone={track.localStatus === "published" ? "success" : "warning"}>{track.localStatus}</Badge>
    },
    {
      key: "streams",
      header: "Streams",
      render: (track) => formatNumber(track.playCount)
    },
    {
      key: "duration",
      header: "Duration",
      render: (track) => (track.durationSeconds > 0 ? formatDuration(track.durationSeconds) : "Not processed")
    },
    {
      key: "releaseDate",
      header: "Release date",
      render: (track) => formatDate(track.releaseDate)
    },
    {
      key: "actions",
      header: "Actions",
      render: (track) => (
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={track.localStatus === "published"}
            onClick={() => handlePublishTrack(track.id)}
            size="sm"
            variant="secondary"
          >
            Publish
          </Button>
          <Button onClick={() => handleDeleteTrack(track.id)} size="sm" variant="danger">
            Delete
          </Button>
        </div>
      )
    }
  ];

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
            <StatCard label="Published albums" value={formatNumber(artistAlbums.length)} />
            <StatCard label="Estimated payout" value={formatCurrencyFromCents(totalRevenueCents, artistRevenue[0]?.currency ?? "USD")} />
          </section>

          <section className="mt-6 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
            <Card>
              <h2 className="text-lg font-semibold text-slate-50">Create release draft</h2>
              <p className="mt-2 text-sm text-slate-400">
                Phase 1 stores this draft in local component state. Backend upload and media storage will replace this flow in Phase 2.
              </p>

              <div className="mt-5 space-y-4">
                <Input
                  disabled={!canManageCatalog}
                  label="Release title"
                  name="title"
                  onChange={(event) => updateDraft("title", event.target.value)}
                  placeholder="Example: Midnight Signal"
                  value={draft.title}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <Select
                    disabled={!canManageCatalog}
                    label="Release type"
                    name="releaseType"
                    onChange={(event) => updateDraft("releaseType", event.target.value)}
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

                <Input
                  accept="audio/mpeg,audio/wav,audio/flac,.mp3,.wav,.flac"
                  disabled={!canManageCatalog}
                  helperText="Supported formats: MP3, WAV, FLAC."
                  label="Audio file"
                  name="audioFile"
                  onChange={(event) => handleAudioFileChange(event.target.files?.[0]?.name ?? "")}
                  type="file"
                />

                <Input
                  accept="image/*"
                  disabled={!canManageCatalog}
                  helperText="Used as the cover image for a single or album."
                  label="Cover image"
                  name="coverImage"
                  onChange={(event) => updateDraft("coverFileName", event.target.files?.[0]?.name ?? "")}
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

                {formMessage ? <p className="text-sm text-brand-500">{formMessage}</p> : null}

                <Button disabled={!canManageCatalog} onClick={handleCreateDraft}>
                  Add draft release
                </Button>
              </div>
            </Card>

            <Card>
              <h2 className="text-lg font-semibold text-slate-50">Catalog management</h2>
              <p className="mt-2 text-sm text-slate-400">
                Artists can review, publish, or remove their own releases. This mock table is intentionally scoped to the signed-in artist.
              </p>
              <div className="mt-5">
                <Table
                  columns={catalogColumns}
                  emptyMessage="No tracks found for this artist."
                  getRowKey={(track) => track.id}
                  rows={artistTracks}
                />
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