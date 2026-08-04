"use client";

import { useCallback, useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader, StatCard } from "@/components/shared";
import { Badge, Button, Card, Input, Modal, Select, Table, Tabs, Textarea, type TableColumn } from "@/components/ui";
import { artistCatalogApi, musicApi, type ArtistProfileApi, type GenreApi } from "@/features/music/api";
import { operationsApi, type ArtistOverviewApi, type RevenueRecordApi } from "@/features/operations/api";
import { ApiError } from "@/lib/api";
import { formatCurrencyFromCents, formatDate, formatDuration, formatNumber } from "@/lib/formatters";
import { useAuth } from "@/providers";
import type { Album, Track } from "@/types/domain";

type ReleaseType = "single" | "album";
type ReleaseStatus = "draft" | "published";

interface AlbumTrackDraft {
  id: string;
  title: string;
  lyrics: string;
  file: File | null;
  durationSeconds: number;
}

interface ReleaseDraft {
  releaseType: ReleaseType;
  title: string;
  releaseDate: string;
  status: ReleaseStatus;
  genreId: string;
  isEarlyAccess: boolean;
  explicit: boolean;
  collaborators: string;
  cover: File | null;
  singleFile: File | null;
  singleDuration: number;
  lyrics: string;
  albumTracks: AlbumTrackDraft[];
}

type EditableRelease =
  | { kind: "track"; value: Track }
  | { kind: "album"; value: Album };

function initialAlbumTrack(): AlbumTrackDraft {
  return { id: crypto.randomUUID(), title: "", lyrics: "", file: null, durationSeconds: 0 };
}

function initialDraft(): ReleaseDraft {
  return {
    releaseType: "single",
    title: "",
    releaseDate: new Date().toISOString().slice(0, 10),
    status: "draft",
    genreId: "",
    isEarlyAccess: false,
    explicit: false,
    collaborators: "",
    cover: null,
    singleFile: null,
    singleDuration: 0,
    lyrics: "",
    albumTracks: [initialAlbumTrack()]
  };
}

function errorMessage(error: unknown) {
  return error instanceof ApiError ? error.message : "The request could not be completed.";
}

function readAudioDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = document.createElement("audio");
    const objectUrl = URL.createObjectURL(file);
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      const seconds = Math.max(1, Math.ceil(audio.duration));
      URL.revokeObjectURL(objectUrl);
      resolve(seconds);
    };
    audio.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not read the audio duration."));
    };
    audio.src = objectUrl;
  });
}

function appendCommonTrackFields(formData: FormData, draft: ReleaseDraft) {
  formData.set("releaseDate", draft.releaseDate);
  formData.set("status", draft.status);
  formData.set("isEarlyAccess", String(draft.isEarlyAccess));
  formData.set("explicit", String(draft.explicit));
  if (draft.genreId) formData.set("genreId", draft.genreId);
  if (draft.cover) formData.set("coverImage", draft.cover);
  draft.collaborators
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .forEach((value) => formData.append("collaboratorIds", value));
}

export default function ArtistDashboardPage() {
  const { currentUser } = useAuth();
  const [artist, setArtist] = useState<ArtistProfileApi | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [genres, setGenres] = useState<GenreApi[]>([]);
  const [overview, setOverview] = useState<ArtistOverviewApi | null>(null);
  const [revenue, setRevenue] = useState<RevenueRecordApi[]>([]);
  const [draft, setDraft] = useState<ReleaseDraft>(() => initialDraft());
  const [editing, setEditing] = useState<EditableRelease | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editLyrics, setEditLyrics] = useState("");
  const [editStatus, setEditStatus] = useState<ReleaseStatus>("draft");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const artistProfileId = currentUser?.artistProfileId;

  const loadData = useCallback(async () => {
    if (!artistProfileId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setNotice("");
    try {
      const [artistData, trackData, albumData, genreData, overviewData, revenueData] = await Promise.all([
        artistCatalogApi.getArtistProfile(artistProfileId),
        musicApi.listTracks({ ordering: "-release_date" }),
        musicApi.listAlbums({ ordering: "-release_date" }),
        artistCatalogApi.listGenres(),
        operationsApi.artistOverview(),
        operationsApi.listRevenue()
      ]);
      setArtist(artistData);
      setTracks(trackData.results.filter((track) => track.artistId === artistProfileId));
      setAlbums(albumData.results.filter((album) => album.artistId === artistProfileId));
      setGenres(genreData);
      setOverview(overviewData);
      setRevenue(revenueData.results.filter((record) => record.artistId === artistProfileId));
    } catch (error) {
      setNotice(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [artistProfileId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const chooseSingleFile = async (file: File | null) => {
    if (!file) return setDraft((value) => ({ ...value, singleFile: null, singleDuration: 0 }));
    try {
      const duration = await readAudioDuration(file);
      setDraft((value) => ({ ...value, singleFile: file, singleDuration: duration, title: value.title || file.name.replace(/\.[^.]+$/, "") }));
    } catch (error) {
      setNotice(errorMessage(error));
    }
  };

  const chooseAlbumFile = async (id: string, file: File | null) => {
    if (!file) {
      setDraft((value) => ({ ...value, albumTracks: value.albumTracks.map((track) => track.id === id ? { ...track, file: null, durationSeconds: 0 } : track) }));
      return;
    }
    try {
      const duration = await readAudioDuration(file);
      setDraft((value) => ({
        ...value,
        albumTracks: value.albumTracks.map((track) => track.id === id ? { ...track, file, durationSeconds: duration, title: track.title || file.name.replace(/\.[^.]+$/, "") } : track)
      }));
    } catch (error) {
      setNotice(errorMessage(error));
    }
  };

  const createRelease = async () => {
    if (!draft.title.trim()) return setNotice("A release title is required.");
    if (draft.releaseType === "single" && !draft.singleFile) return setNotice("Select an audio file for the single.");
    if (draft.releaseType === "album" && draft.albumTracks.some((track) => !track.file || !track.title.trim())) return setNotice("Every album track needs a title and audio file.");

    setBusy(true);
    setNotice("");
    let createdAlbumId: string | null = null;
    try {
      if (draft.releaseType === "single") {
        const formData = new FormData();
        formData.set("title", draft.title.trim());
        formData.set("audioFile", draft.singleFile as File);
        formData.set("durationSeconds", String(draft.singleDuration));
        formData.set("lyrics", draft.lyrics.trim());
        appendCommonTrackFields(formData, draft);
        await artistCatalogApi.createTrack(formData);
      } else {
        const albumData = new FormData();
        albumData.set("title", draft.title.trim());
        albumData.set("releaseDate", draft.releaseDate);
        albumData.set("status", draft.status);
        albumData.set("isEarlyAccess", String(draft.isEarlyAccess));
        if (draft.genreId) albumData.set("genreId", draft.genreId);
        if (draft.cover) albumData.set("coverImage", draft.cover);
        const album = await artistCatalogApi.createAlbum(albumData);
        createdAlbumId = album.id;

        for (let index = 0; index < draft.albumTracks.length; index += 1) {
          const albumTrack = draft.albumTracks[index];
          const trackData = new FormData();
          trackData.set("title", albumTrack.title.trim());
          trackData.set("audioFile", albumTrack.file as File);
          trackData.set("durationSeconds", String(albumTrack.durationSeconds));
          trackData.set("lyrics", albumTrack.lyrics.trim());
          trackData.set("albumId", album.id);
          trackData.set("trackNumber", String(index + 1));
          appendCommonTrackFields(trackData, draft);
          await artistCatalogApi.createTrack(trackData);
        }
      }
      setDraft(initialDraft());
      setNotice("Release saved successfully.");
      await loadData();
    } catch (error) {
      if (createdAlbumId) await artistCatalogApi.deleteAlbum(createdAlbumId).catch(() => undefined);
      setNotice(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const deleteRelease = async (release: EditableRelease) => {
    if (!window.confirm(`Delete ${release.value.title}? This action cannot be undone.`)) return;
    setBusy(true);
    try {
      if (release.kind === "album") await artistCatalogApi.deleteAlbum(release.value.id);
      else await artistCatalogApi.deleteTrack(release.value.id);
      setNotice("Release deleted.");
      await loadData();
    } catch (error) {
      setNotice(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const openEdit = (release: EditableRelease) => {
    setEditing(release);
    setEditTitle(release.value.title);
    setEditStatus(release.value.status ?? "draft");
    setEditLyrics(release.kind === "track" ? release.value.lyrics ?? "" : "");
  };

  const saveEdit = async () => {
    if (!editing || !editTitle.trim()) return;
    const data = new FormData();
    data.set("title", editTitle.trim());
    data.set("status", editStatus);
    if (editing.kind === "track") data.set("lyrics", editLyrics.trim());
    setBusy(true);
    try {
      if (editing.kind === "track") await artistCatalogApi.updateTrack(editing.value.id, data);
      else await artistCatalogApi.updateAlbum(editing.value.id, data);
      setEditing(null);
      setNotice("Release updated.");
      await loadData();
    } catch (error) {
      setNotice(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const totalStreams = tracks.reduce((sum, track) => sum + (track.playCount ?? 0), 0);
  const totalListeners = tracks.reduce((sum, track) => sum + (track.uniqueListeners ?? 0), 0);
  const totalRevenue = revenue.reduce((sum, record) => sum + record.netRevenueCents, 0);
  const currency = revenue[0]?.currency ?? "USD";

  const trackColumns: TableColumn<Track>[] = [
    { key: "track", header: "Track", render: (row) => <div><p className="font-medium text-slate-50">{row.title}</p><p className="text-xs text-slate-400">{row.albumTitle ?? "Single"}</p></div> },
    { key: "status", header: "Status", render: (row) => <Badge tone={row.status === "published" ? "success" : "warning"}>{row.status ?? "published"}</Badge> },
    { key: "duration", header: "Duration", render: (row) => formatDuration(row.durationSeconds) },
    { key: "streams", header: "Streams", render: (row) => formatNumber(row.playCount ?? 0) },
    { key: "listeners", header: "Listeners", render: (row) => formatNumber(row.uniqueListeners ?? 0) },
    { key: "actions", header: "Actions", render: (row) => <div className="flex gap-2"><Button onClick={() => openEdit({ kind: "track", value: row })} size="sm" variant="secondary">Edit</Button><Button onClick={() => void deleteRelease({ kind: "track", value: row })} size="sm" variant="danger">Delete</Button></div> }
  ];

  const albumColumns: TableColumn<Album>[] = [
    { key: "album", header: "Album", render: (row) => <span className="font-medium text-slate-50">{row.title}</span> },
    { key: "date", header: "Release date", render: (row) => formatDate(row.releaseDate) },
    { key: "tracks", header: "Tracks", render: (row) => formatNumber(row.trackIds.length) },
    { key: "status", header: "Status", render: (row) => <Badge tone={row.status === "published" ? "success" : "warning"}>{row.status ?? "published"}</Badge> },
    { key: "actions", header: "Actions", render: (row) => <div className="flex gap-2"><Button onClick={() => openEdit({ kind: "album", value: row })} size="sm" variant="secondary">Edit</Button><Button onClick={() => void deleteRelease({ kind: "album", value: row })} size="sm" variant="danger">Delete</Button></div> }
  ];

  const revenueColumns: TableColumn<RevenueRecordApi>[] = [
    { key: "period", header: "Period", render: (row) => `${formatDate(row.periodStart)} - ${formatDate(row.periodEnd)}` },
    { key: "streams", header: "Streams", render: (row) => formatNumber(row.streamCount) },
    { key: "listeners", header: "Unique listeners", render: (row) => formatNumber(row.uniqueListeners) },
    { key: "amount", header: "Net revenue", render: (row) => formatCurrencyFromCents(row.netRevenueCents, row.currency) },
    { key: "status", header: "Payment", render: (row) => <Badge tone={row.paymentStatus === "settled" ? "success" : "warning"}>{row.paymentStatus}</Badge> }
  ];

  if (currentUser && currentUser.role !== "artist") {
    return <DashboardLayout eyebrow="Artist workspace"><PageHeader description="Only approved artists can manage releases." title="Artist access required" /></DashboardLayout>;
  }

  const uploadPanel = (
    <Card>
      <h2 className="text-lg font-semibold text-slate-50">Create a release</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Select label="Release type" onChange={(event) => setDraft((value) => ({ ...value, releaseType: event.target.value as ReleaseType }))} options={[{ value: "single", label: "Single" }, { value: "album", label: "Album" }]} value={draft.releaseType} />
        <Input label="Title" onChange={(event) => setDraft((value) => ({ ...value, title: event.target.value }))} value={draft.title} />
        <Input label="Release date" onChange={(event) => setDraft((value) => ({ ...value, releaseDate: event.target.value }))} type="date" value={draft.releaseDate} />
        <Select label="Status" onChange={(event) => setDraft((value) => ({ ...value, status: event.target.value as ReleaseStatus }))} options={[{ value: "draft", label: "Draft" }, { value: "published", label: "Published" }]} value={draft.status} />
        <Select label="Genre" onChange={(event) => setDraft((value) => ({ ...value, genreId: event.target.value }))} options={[{ value: "", label: "No genre" }, ...genres.map((genre) => ({ value: String(genre.id), label: genre.name }))]} value={draft.genreId} />
        <Input helperText="Comma-separated artist profile IDs" label="Collaborators" onChange={(event) => setDraft((value) => ({ ...value, collaborators: event.target.value }))} value={draft.collaborators} />
        <Input accept="image/*" label="Cover image" onChange={(event) => setDraft((value) => ({ ...value, cover: event.target.files?.[0] ?? null }))} type="file" />
        <div className="space-y-2 text-sm text-slate-200">
          <label className="flex items-center gap-2"><input checked={draft.isEarlyAccess} onChange={(event) => setDraft((value) => ({ ...value, isEarlyAccess: event.target.checked }))} type="checkbox" /> Gold early access</label>
          <label className="flex items-center gap-2"><input checked={draft.explicit} onChange={(event) => setDraft((value) => ({ ...value, explicit: event.target.checked }))} type="checkbox" /> Explicit content</label>
        </div>
      </div>

      {draft.releaseType === "single" ? (
        <div className="mt-5 grid gap-4">
          <Input accept="audio/mpeg,audio/wav,audio/flac,audio/mp4,audio/ogg" label="Audio file" onChange={(event) => void chooseSingleFile(event.target.files?.[0] ?? null)} type="file" />
          <Textarea label="Lyrics" onChange={(event) => setDraft((value) => ({ ...value, lyrics: event.target.value }))} rows={6} value={draft.lyrics} />
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {draft.albumTracks.map((track, index) => (
            <Card key={track.id}>
              <div className="flex items-center justify-between"><h3 className="font-medium text-slate-50">Track {index + 1}</h3><Button disabled={draft.albumTracks.length === 1} onClick={() => setDraft((value) => ({ ...value, albumTracks: value.albumTracks.filter((item) => item.id !== track.id) }))} size="sm" variant="danger">Remove</Button></div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <Input label="Track title" onChange={(event) => setDraft((value) => ({ ...value, albumTracks: value.albumTracks.map((item) => item.id === track.id ? { ...item, title: event.target.value } : item) }))} value={track.title} />
                <Input accept="audio/mpeg,audio/wav,audio/flac,audio/mp4,audio/ogg" label="Audio file" onChange={(event) => void chooseAlbumFile(track.id, event.target.files?.[0] ?? null)} type="file" />
              </div>
              <Textarea className="mt-3" label="Lyrics" onChange={(event) => setDraft((value) => ({ ...value, albumTracks: value.albumTracks.map((item) => item.id === track.id ? { ...item, lyrics: event.target.value } : item) }))} rows={3} value={track.lyrics} />
            </Card>
          ))}
          <Button onClick={() => setDraft((value) => ({ ...value, albumTracks: [...value.albumTracks, initialAlbumTrack()] }))} variant="secondary">Add album track</Button>
        </div>
      )}
      <Button className="mt-5" disabled={busy} onClick={() => void createRelease()}>{busy ? "Saving..." : "Save release"}</Button>
    </Card>
  );

  return (
    <DashboardLayout eyebrow="Artist workspace">
      <PageHeader actions={<Button disabled={loading} onClick={() => void loadData()} variant="secondary">Refresh</Button>} description="Upload and manage releases, lyrics, cover images, statistics, and monthly revenue." title={artist?.stageName ?? "Artist dashboard"} />
      {notice ? <p className="mt-4 rounded-md border border-surface-600 bg-surface-800 p-3 text-sm text-slate-200">{notice}</p> : null}
      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Published tracks" value={formatNumber(tracks.filter((track) => track.status === "published").length)} />
        <StatCard label="Total streams" value={formatNumber(overview?.streams ?? totalStreams)} />
        <StatCard label="Unique listeners" value={formatNumber(overview?.uniqueListeners ?? totalListeners)} />
        <StatCard label="Net revenue" value={formatCurrencyFromCents(overview?.currencyBreakdown.reduce((sum, row) => sum + row.artistPayoutCents, 0) ?? totalRevenue, overview?.currencyBreakdown[0]?.currency ?? currency)} />
      </section>
      <section className="mt-6">
        <Tabs tabs={[
          { id: "upload", label: "New release", content: uploadPanel },
          { id: "tracks", label: "Tracks", content: <Table columns={trackColumns} emptyMessage={loading ? "Loading tracks..." : "No tracks yet."} getRowKey={(row) => row.id} rows={tracks} /> },
          { id: "albums", label: "Albums", content: <Table columns={albumColumns} emptyMessage={loading ? "Loading albums..." : "No albums yet."} getRowKey={(row) => row.id} rows={albums} /> },
          { id: "revenue", label: "Accounting", content: <Table columns={revenueColumns} emptyMessage={loading ? "Loading accounting..." : "No monthly records yet."} getRowKey={(row) => row.id} rows={revenue} /> }
        ]} />
      </section>
      <Modal onClose={() => setEditing(null)} open={Boolean(editing)} title="Edit release">
        {editing ? <div className="space-y-4"><Input label="Title" onChange={(event) => setEditTitle(event.target.value)} value={editTitle} /><Select label="Status" onChange={(event) => setEditStatus(event.target.value as ReleaseStatus)} options={[{ value: "draft", label: "Draft" }, { value: "published", label: "Published" }]} value={editStatus} />{editing.kind === "track" ? <Textarea label="Lyrics" onChange={(event) => setEditLyrics(event.target.value)} rows={6} value={editLyrics} /> : null}<Button disabled={busy} onClick={() => void saveEdit()}>Save changes</Button></div> : null}
      </Modal>
    </DashboardLayout>
  );
}
