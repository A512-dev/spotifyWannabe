const assert = require("node:assert/strict");
const test = require("node:test");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

const { PageHeader, TrackCard, AlbumCard, EmptyState } = require("@/components/shared");
const { Badge, Button, Table } = require("@/components/ui");
const { albums } = require("@/data/albums");
const { artists } = require("@/data/artists");
const { tracks } = require("@/data/tracks");
const { getPlaylistStorageKey, readStoredPlaylists, writeStoredPlaylists } = require("@/lib/playlist-storage");
const { PlayerProvider } = require("@/providers/PlayerProvider");

function render(element) {
  return renderToStaticMarkup(element);
}

test("renders a page header with title and description", () => {
  const html = render(
    React.createElement(PageHeader, {
      title: "Home",
      description: "Discover new music."
    })
  );

  assert.match(html, /Home/);
  assert.match(html, /Discover new music\./);
});

test("renders primary buttons with a safe default type", () => {
  const html = render(React.createElement(Button, null, "Play"));

  assert.match(html, /type="button"/);
  assert.match(html, /Play/);
});

test("renders badge tones for status labels", () => {
  const html = render(React.createElement(Badge, { tone: "success" }, "Verified"));

  assert.match(html, /green-500/);
  assert.match(html, /Verified/);
});

test("renders empty states with optional actions", () => {
  const html = render(
    React.createElement(
      EmptyState,
      {
        action: React.createElement(Button, null, "Browse"),
        description: "Nothing is here yet.",
        title: "No results"
      }
    )
  );

  assert.match(html, /No results/);
  assert.match(html, /Nothing is here yet\./);
  assert.match(html, /Browse/);
});

test("renders table headers and row cells", () => {
  const html = render(
    React.createElement(Table, {
      columns: [{ key: "title", header: "Title", render: (row) => row.title }],
      getRowKey: (row) => row.id,
      rows: [{ id: "track-1", title: "Neon Rain" }]
    })
  );

  assert.match(html, /Title/);
  assert.match(html, /Neon Rain/);
});

test("renders table empty messages", () => {
  const html = render(
    React.createElement(Table, {
      columns: [{ key: "title", header: "Title", render: (row) => row.title }],
      emptyMessage: "No tracks found.",
      getRowKey: (row) => row.id,
      rows: []
    })
  );

  assert.match(html, /No tracks found\./);
});

test("renders track cards with artist links and play metadata", () => {
  const track = tracks.find((item) => item.id === "track-neon-rain");
  const artist = artists.find((item) => item.id === track.artistId);
  const html = render(
    React.createElement(
      PlayerProvider,
      null,
      React.createElement(TrackCard, {
        artistName: artist.stageName,
        track
      })
    )
  );

  assert.match(html, /Neon Rain/);
  assert.match(html, /href="\/artist\/artist-lina"/);
  assert.match(html, /582,100 plays/);
});

test("renders album cards with album and artist names", () => {
  const album = albums.find((item) => item.id === "album-after-midnight");
  const artist = artists.find((item) => item.id === album.artistId);
  const html = render(React.createElement(AlbumCard, { album, artistName: artist.stageName }));

  assert.match(html, /After Midnight/);
  assert.match(html, /Lina Torres/);
  assert.match(html, /After Midnight cover/);
});

test("reads fallback playlists when browser storage is unavailable", () => {
  const fallback = [{ id: "playlist-1", ownerId: "user-1", itemIds: [] }];

  assert.equal(readStoredPlaylists("user-1", fallback), fallback);
});

test("writes and reads user-scoped playlists from local storage", () => {
  const store = new Map();
  global.window = {
    localStorage: {
      getItem: (key) => store.get(key) ?? null,
      setItem: (key, value) => store.set(key, value)
    }
  };
  const playlists = [{ id: "playlist-1", ownerId: "user-1", itemIds: ["track-neon-rain"] }];

  writeStoredPlaylists("user-1", playlists);

  assert.deepEqual(readStoredPlaylists("user-1", []), playlists);
  assert.equal(store.has(getPlaylistStorageKey("user-1")), true);
  delete global.window;
});
