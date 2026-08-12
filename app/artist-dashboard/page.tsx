"use client";

import { useCallback, useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader, StatCard } from "@/components/shared";
import { Badge, Button, Card, Input, Modal, Select, Table, Tabs, Textarea, type TableColumn } from "@/components/ui";
import { artistCatalogApi, musicApi, type ArtistProfileApi, type GenreApi } from "@/features/music/api";
import { operationsApi, type ArtistOverviewApi, type RevenueRecordApi } from "@/features/operations/api";
import { ApiError } from "@/lib/api";
import { formatCurrencyFromCents, formatDate, formatDuration, formatNumber } from "@/lib/formatters";
import { useAuth, useUserPreferences } from "@/providers";
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
    albumTracks: [initialAlbumTrack(), initialAlbumTrack()]
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
  const { locale, t } = useUserPreferences();
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
  const [editReleaseDate, setEditReleaseDate] = useState("");
  const [editGenreId, setEditGenreId] = useState("");
  const [editEarlyAccess, setEditEarlyAccess] = useState(false);
  const [editExplicit, setEditExplicit] = useState(false);
  const [editCollaborators, setEditCollaborators] = useState("");
  const [editCover, setEditCover] = useState<File | null>(null);
  const [editAudio, setEditAudio] = useState<File | null>(null);
  const [editDuration, setEditDuration] = useState(0);
  const [profileBio, setProfileBio] = useState("");
  const [profileGenres, setProfileGenres] = useState("");
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profileBanner, setProfileBanner] = useState<File | null>(null);
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
      setProfileBio(artistData.bio);
      setProfileGenres(artistData.genreTags.join(", "));
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
    if (!draft.title.trim()) return setNotice(t("A release title is required."));
    if (draft.releaseType === "single" && !draft.singleFile) return setNotice(t("Select an audio file for the single."));
    if (draft.releaseType === "album" && draft.albumTracks.length < 2) return setNotice(t("An album needs at least two tracks."));
    if (draft.releaseType === "album" && draft.albumTracks.some((track) => !track.file || !track.title.trim())) return setNotice(t("Every album track needs a title and audio file."));

    setBusy(true);
    setNotice("");
    try {
      if (draft.releaseType === "single") {
        const formData = new FormData();
        formData.set("title", draft.title.trim());
        formData.set("audioFile", draft.singleFile as File);
        formData.set("durationSeconds", String(draft.singleDuration));
        formData.set("trackNumber", "1");
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
        albumData.set("explicit", String(draft.explicit));
        draft.collaborators.split(",").map((value) => value.trim()).filter(Boolean).forEach((value) => albumData.append("collaboratorIds", value));
        draft.albumTracks.forEach((albumTrack) => {
          albumData.append("trackTitles", albumTrack.title.trim());
          albumData.append("trackFiles", albumTrack.file as File);
          albumData.append("trackDurations", String(albumTrack.durationSeconds));
          albumData.append("trackLyrics", albumTrack.lyrics.trim());
        });
        await artistCatalogApi.createAlbumRelease(albumData);
      }
      setDraft(initialDraft());
      setNotice(t("Release saved successfully."));
      await loadData();
    } catch (error) {
      setNotice(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const deleteRelease = async (release: EditableRelease) => {
    if (!window.confirm(t("Delete {title}? This action cannot be undone.", { title: release.value.title }))) return;
    setBusy(true);
    try {
      if (release.kind === "album") await artistCatalogApi.deleteAlbum(release.value.id);
      else await artistCatalogApi.deleteTrack(release.value.id);
      setNotice(t("Release deleted."));
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
    setEditReleaseDate(release.value.releaseDate);
    setEditGenreId(release.value.genreId ? String(release.value.genreId) : "");
    setEditEarlyAccess(release.value.isEarlyAccess ?? false);
    setEditExplicit(release.kind === "track" ? release.value.explicit : false);
    setEditCollaborators(release.kind === "track" ? (release.value.collaboratorIds ?? []).join(", ") : "");
    setEditCover(null);
    setEditAudio(null);
    setEditDuration(release.kind === "track" ? release.value.durationSeconds : 0);
  };

  const saveEdit = async () => {
    if (!editing || !editTitle.trim()) return;
    const data = new FormData();
    data.set("title", editTitle.trim());
    data.set("status", editStatus);
    data.set("releaseDate", editReleaseDate);
    data.set("genreId", editGenreId);
    data.set("isEarlyAccess", String(editEarlyAccess));
    if (editCover) data.set("coverImage", editCover);
    if (editing.kind === "track") {
      data.set("lyrics", editLyrics.trim());
      data.set("explicit", String(editExplicit));
      if (editAudio) data.set("audioFile", editAudio);
      if (editAudio) data.set("durationSeconds", String(editDuration));
      const collaborators = editCollaborators.split(",").map((value) => value.trim()).filter(Boolean);
      if (collaborators.length === 0) data.set("clearCollaborators", "true");
      else collaborators.forEach((value) => data.append("collaboratorIds", value));
    }
    setBusy(true);
    try {
      if (editing.kind === "track") await artistCatalogApi.updateTrack(editing.value.id, data);
      else await artistCatalogApi.updateAlbum(editing.value.id, data);
      setEditing(null);
      setNotice(t("Release updated."));
      await loadData();
    } catch (error) {
      setNotice(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const saveArtistProfile = async () => {
    if (!artistProfileId) return;
    const data = new FormData();
    data.set("bio", profileBio.trim());
    const genreTags = profileGenres.split(",").map((value) => value.trim()).filter(Boolean);
    if (genreTags.length === 0) data.append("genreTags", "");
    else genreTags.forEach((value) => data.append("genreTags", value));
    if (profileImage) data.set("profileImage", profileImage);
    if (profileBanner) data.set("bannerImage", profileBanner);
    setBusy(true);
    try {
      const updated = await artistCatalogApi.updateArtistProfile(artistProfileId, data);
      setArtist(updated);
      setProfileImage(null);
      setProfileBanner(null);
      setNotice(t("Artist profile updated."));
    } catch (error) {
      setNotice(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const currencyBreakdown = overview?.currencyBreakdown ?? [];
  const netRevenueLabel = currencyBreakdown.length === 0
    ? t("No revenue")
    : currencyBreakdown.length === 1
      ? formatCurrencyFromCents(currencyBreakdown[0].artistPayoutCents, currencyBreakdown[0].currency, locale)
      : t("{count} currencies", { count: formatNumber(currencyBreakdown.length, locale) });

  const trackRevenueLabel = (trackId: string) => {
    const rows = overview?.trackRevenueBreakdown.filter((row) => row.trackId === trackId) ?? [];
    if (rows.length === 0) return t("No revenue");
    return rows.map((row) => formatCurrencyFromCents(row.netRevenueCents, row.currency ?? "USD", locale)).join(" · ");
  };

  const trackColumns: TableColumn<Track>[] = [
    { key: "track", header: t("Track"), render: (row) => <div><p className="font-medium text-slate-50">{row.title}</p><p className="text-xs text-slate-400">{row.albumTitle ?? t("Single")}</p></div> },
    { key: "status", header: t("Status"), render: (row) => <Badge tone={row.status === "published" ? "success" : "warning"}>{t(row.status === "draft" ? "Draft" : "Published")}</Badge> },
    { key: "duration", header: t("Duration"), render: (row) => formatDuration(row.durationSeconds) },
    { key: "streams", header: t("Streams"), render: (row) => formatNumber(row.playCount ?? 0, locale) },
    { key: "listeners", header: t("Listeners"), render: (row) => formatNumber(row.uniqueListeners ?? 0, locale) },
    { key: "revenue", header: t("Net revenue"), render: (row) => trackRevenueLabel(row.id) },
    { key: "actions", header: t("Actions"), render: (row) => <div className="flex gap-2"><Button onClick={() => openEdit({ kind: "track", value: row })} size="sm" variant="secondary">{t("Edit")}</Button><Button onClick={() => void deleteRelease({ kind: "track", value: row })} size="sm" variant="danger">{t("Delete")}</Button></div> }
  ];

  const albumColumns: TableColumn<Album>[] = [
    { key: "album", header: t("Album"), render: (row) => <span className="font-medium text-slate-50">{row.title}</span> },
    { key: "date", header: t("Release date"), render: (row) => formatDate(row.releaseDate, locale) },
    { key: "tracks", header: t("Tracks"), render: (row) => formatNumber(row.trackIds.length, locale) },
    { key: "status", header: t("Status"), render: (row) => <Badge tone={row.status === "published" ? "success" : "warning"}>{t(row.status === "draft" ? "Draft" : "Published")}</Badge> },
    { key: "actions", header: t("Actions"), render: (row) => <div className="flex gap-2"><Button onClick={() => openEdit({ kind: "album", value: row })} size="sm" variant="secondary">{t("Edit")}</Button><Button onClick={() => void deleteRelease({ kind: "album", value: row })} size="sm" variant="danger">{t("Delete")}</Button></div> }
  ];

  const revenueColumns: TableColumn<RevenueRecordApi>[] = [
    { key: "period", header: t("Period"), render: (row) => `${formatDate(row.periodStart, locale)} - ${formatDate(row.periodEnd, locale)}` },
    { key: "streams", header: t("Streams"), render: (row) => formatNumber(row.streamCount, locale) },
    { key: "listeners", header: t("Unique listeners"), render: (row) => formatNumber(row.uniqueListeners, locale) },
    { key: "amount", header: t("Net revenue"), render: (row) => formatCurrencyFromCents(row.netRevenueCents, row.currency, locale) },
    { key: "status", header: t("Payment"), render: (row) => <Badge tone={row.paymentStatus === "settled" ? "success" : "warning"}>{t(row.paymentStatus)}</Badge> }
  ];

  if (currentUser && currentUser.role !== "artist") {
    return <DashboardLayout eyebrow={t("Artist workspace")}><PageHeader description={t("Only approved artists can manage releases.")} title={t("Artist access required")} /></DashboardLayout>;
  }

  const uploadPanel = (
    <Card>
      <h2 className="text-lg font-semibold text-slate-50">{t("Create a release")}</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Select label={t("Release type")} onChange={(event) => setDraft((value) => ({ ...value, releaseType: event.target.value as ReleaseType }))} options={[{ value: "single", label: t("Single") }, { value: "album", label: t("Album") }]} value={draft.releaseType} />
        <Input label={t("Title")} onChange={(event) => setDraft((value) => ({ ...value, title: event.target.value }))} value={draft.title} />
        <Input label={t("Release date")} onChange={(event) => setDraft((value) => ({ ...value, releaseDate: event.target.value }))} type="date" value={draft.releaseDate} />
        <Select label={t("Status")} onChange={(event) => setDraft((value) => ({ ...value, status: event.target.value as ReleaseStatus }))} options={[{ value: "draft", label: t("Draft") }, { value: "published", label: t("Published") }]} value={draft.status} />
        <Select label={t("Genre")} onChange={(event) => setDraft((value) => ({ ...value, genreId: event.target.value }))} options={[{ value: "", label: t("No genre") }, ...genres.map((genre) => ({ value: String(genre.id), label: genre.name }))]} value={draft.genreId} />
        <Input helperText={t("Comma-separated artist profile IDs")} label={t("Collaborators")} onChange={(event) => setDraft((value) => ({ ...value, collaborators: event.target.value }))} value={draft.collaborators} />
        <Input accept="image/*" label={t("Cover image")} onChange={(event) => setDraft((value) => ({ ...value, cover: event.target.files?.[0] ?? null }))} type="file" />
        <div className="space-y-2 text-sm text-slate-200">
          <label className="flex items-center gap-2"><input checked={draft.isEarlyAccess} onChange={(event) => setDraft((value) => ({ ...value, isEarlyAccess: event.target.checked }))} type="checkbox" /> {t("Gold early access")}</label>
          <label className="flex items-center gap-2"><input checked={draft.explicit} onChange={(event) => setDraft((value) => ({ ...value, explicit: event.target.checked }))} type="checkbox" /> {t("Explicit content")}</label>
        </div>
      </div>

      {draft.releaseType === "single" ? (
        <div className="mt-5 grid gap-4">
          <Input accept="audio/mpeg,audio/wav,audio/flac,audio/mp4,audio/ogg" label={t("Audio file")} onChange={(event) => void chooseSingleFile(event.target.files?.[0] ?? null)} type="file" />
          <Textarea label={t("Lyrics")} onChange={(event) => setDraft((value) => ({ ...value, lyrics: event.target.value }))} rows={6} value={draft.lyrics} />
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {draft.albumTracks.map((track, index) => (
            <Card key={track.id}>
              <div className="flex items-center justify-between"><h3 className="font-medium text-slate-50">{t("Track {count}", { count: formatNumber(index + 1, locale) })}</h3><Button disabled={draft.albumTracks.length <= 2} onClick={() => setDraft((value) => ({ ...value, albumTracks: value.albumTracks.filter((item) => item.id !== track.id) }))} size="sm" variant="danger">{t("Remove")}</Button></div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <Input label={t("Track title")} onChange={(event) => setDraft((value) => ({ ...value, albumTracks: value.albumTracks.map((item) => item.id === track.id ? { ...item, title: event.target.value } : item) }))} value={track.title} />
                <Input accept="audio/mpeg,audio/wav,audio/flac,audio/mp4,audio/ogg" label={t("Audio file")} onChange={(event) => void chooseAlbumFile(track.id, event.target.files?.[0] ?? null)} type="file" />
              </div>
              <Textarea className="mt-3" label={t("Lyrics")} onChange={(event) => setDraft((value) => ({ ...value, albumTracks: value.albumTracks.map((item) => item.id === track.id ? { ...item, lyrics: event.target.value } : item) }))} rows={3} value={track.lyrics} />
            </Card>
          ))}
          <Button onClick={() => setDraft((value) => ({ ...value, albumTracks: [...value.albumTracks, initialAlbumTrack()] }))} variant="secondary">{t("Add album track")}</Button>
        </div>
      )}
      <Button className="mt-5" disabled={busy} onClick={() => void createRelease()}>{busy ? t("Saving...") : t("Save release")}</Button>
    </Card>
  );

  const profilePanel = (
    <Card>
      <h2 className="text-lg font-semibold text-slate-50">{t("Public artist profile")}</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Textarea className="md:col-span-2" label={t("Biography")} onChange={(event) => setProfileBio(event.target.value)} rows={6} value={profileBio} />
        <Input helperText={t("Comma-separated genres")} label={t("Genre tags")} onChange={(event) => setProfileGenres(event.target.value)} value={profileGenres} />
        <Input accept="image/*" label={t("Profile image")} onChange={(event) => setProfileImage(event.target.files?.[0] ?? null)} type="file" />
        <Input accept="image/*" label={t("Banner image")} onChange={(event) => setProfileBanner(event.target.files?.[0] ?? null)} type="file" />
      </div>
      <Button className="mt-4" disabled={busy} onClick={() => void saveArtistProfile()}>{t("Save artist profile")}</Button>
    </Card>
  );

  return (
    <DashboardLayout eyebrow={t("Artist workspace")}>
      <PageHeader actions={<Button disabled={loading} onClick={() => void loadData()} variant="secondary">{t("Refresh")}</Button>} description={t("Upload and manage releases, lyrics, cover images, statistics, and monthly revenue.")} title={artist?.stageName ?? t("Artist dashboard")} />
      {notice ? <p className="mt-4 rounded-md border border-surface-600 bg-surface-800 p-3 text-sm text-slate-200">{notice}</p> : null}
      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t("Published tracks")} value={formatNumber(tracks.filter((track) => track.status === "published").length, locale)} />
        <StatCard label={t("Total streams")} value={formatNumber(overview?.streams ?? 0, locale)} />
        <StatCard label={t("Unique listeners")} value={formatNumber(overview?.uniqueListeners ?? 0, locale)} />
        <StatCard label={t("Net revenue")} value={netRevenueLabel} />
      </section>
      {currencyBreakdown.length > 1 ? <section className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{currencyBreakdown.map((row) => <Card key={row.currency}><p className="text-xs uppercase text-slate-400">{t("{currency} net revenue", { currency: row.currency })}</p><p className="mt-2 text-lg font-semibold text-slate-50">{formatCurrencyFromCents(row.artistPayoutCents, row.currency, locale)}</p></Card>)}</section> : null}
      <section className="mt-6">
        <Tabs tabs={[
          { id: "upload", label: t("New release"), content: uploadPanel },
          { id: "profile", label: t("Artist profile"), content: profilePanel },
          { id: "tracks", label: t("Tracks"), content: <Table columns={trackColumns} emptyMessage={t(loading ? "Loading tracks..." : "No tracks yet.")} getRowKey={(row) => row.id} rows={tracks} /> },
          { id: "albums", label: t("Albums"), content: <Table columns={albumColumns} emptyMessage={t(loading ? "Loading albums..." : "No albums yet.")} getRowKey={(row) => row.id} rows={albums} /> },
          { id: "revenue", label: t("Accounting"), content: <Table columns={revenueColumns} emptyMessage={t(loading ? "Loading accounting..." : "No monthly records yet.")} getRowKey={(row) => row.id} rows={revenue} /> }
        ]} />
      </section>
      <Modal onClose={() => setEditing(null)} open={Boolean(editing)} title={t("Edit release")}>
        {editing ? <div className="grid gap-4 md:grid-cols-2"><Input label={t("Title")} onChange={(event) => setEditTitle(event.target.value)} value={editTitle} /><Select label={t("Status")} onChange={(event) => setEditStatus(event.target.value as ReleaseStatus)} options={[{ value: "draft", label: t("Draft") }, { value: "published", label: t("Published") }]} value={editStatus} /><Input label={t("Release date")} onChange={(event) => setEditReleaseDate(event.target.value)} type="date" value={editReleaseDate} /><Select label={t("Genre")} onChange={(event) => setEditGenreId(event.target.value)} options={[{ value: "", label: t("No genre") }, ...genres.map((genre) => ({ value: String(genre.id), label: genre.name }))]} value={editGenreId} /><Input accept="image/*" label={t("Replacement cover")} onChange={(event) => setEditCover(event.target.files?.[0] ?? null)} type="file" /><label className="flex items-center gap-2 text-sm text-slate-200"><input checked={editEarlyAccess} onChange={(event) => setEditEarlyAccess(event.target.checked)} type="checkbox" /> {t("Gold early access")}</label>{editing.kind === "track" ? <><Input accept="audio/*" label={t("Replacement audio")} onChange={(event) => { const file = event.target.files?.[0] ?? null; setEditAudio(file); if (file) void readAudioDuration(file).then(setEditDuration).catch((error) => setNotice(errorMessage(error))); }} type="file" /><Input helperText={t("Comma-separated artist profile IDs")} label={t("Collaborators")} onChange={(event) => setEditCollaborators(event.target.value)} value={editCollaborators} /><label className="flex items-center gap-2 text-sm text-slate-200"><input checked={editExplicit} onChange={(event) => setEditExplicit(event.target.checked)} type="checkbox" /> {t("Explicit content")}</label><Textarea className="md:col-span-2" label={t("Lyrics")} onChange={(event) => setEditLyrics(event.target.value)} rows={6} value={editLyrics} /></> : null}<div className="md:col-span-2"><Button disabled={busy} onClick={() => void saveEdit()}>{t("Save changes")}</Button></div></div> : null}
      </Modal>
    </DashboardLayout>
  );
}
