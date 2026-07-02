const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const { mockCredentials } = require("@/data/auth-credentials");
const { artists } = require("@/data/artists");
const { playlistItems, playlists } = require("@/data/playlists");
const { tracks } = require("@/data/tracks");
const { users } = require("@/data/users");
const { authenticateUser, getPostLoginPath, normalizeEmail } = require("@/lib/auth");
const { formatCurrencyFromCents, formatDuration, formatNumber } = require("@/lib/formatters");
const { canAccessRoute, filterNavigationForUser } = require("@/lib/permissions");
const {
  canAccessAdvancedStats,
  canCreatePlaylist,
  canEditProfileImage,
  canUseOfflineMode,
  formatPlaylistLimit,
  hasUnlimitedPlaylistLimit
} = require("@/lib/subscription");

const listener = users.find((user) => user.role === "listener" && user.subscriptionTier === "gold");
const basicListener = users.find((user) => user.subscriptionTier === "basic");
const artist = users.find((user) => user.role === "artist");
const admin = users.find((user) => user.role === "admin");

test("normalizes email before auth lookups", () => {
  assert.equal(normalizeEmail("  MAYA.Listener@Example.com "), "maya.listener@example.com");
});

test("authenticates a known mock user with matching credentials", () => {
  const user = authenticateUser("MAYA.listener@example.com", "password123", users, mockCredentials);

  assert.equal(user?.id, "user-listener-1");
});

test("rejects an invalid password", () => {
  assert.equal(authenticateUser("maya.listener@example.com", "wrong", users, mockCredentials), null);
});

test("returns role-specific post-login destinations", () => {
  assert.equal(getPostLoginPath(admin), "/admin");
  assert.equal(getPostLoginPath(artist), "/artist-dashboard");
});

test("allows admins into admin routes", () => {
  assert.equal(canAccessRoute(admin, "/admin"), true);
});

test("blocks listeners from admin routes", () => {
  assert.equal(canAccessRoute(listener, "/admin"), false);
});

test("filters navigation by user role", () => {
  const visibleItems = filterNavigationForUser(
    [
      { label: "Home", allowedRoles: ["listener", "artist", "support", "admin"] },
      { label: "Support", allowedRoles: ["support", "admin"] }
    ],
    listener
  );

  assert.deepEqual(visibleItems.map((item) => item.label), ["Home"]);
});

test("formats music-facing numbers and durations", () => {
  assert.equal(formatDuration(214), "3:34");
  assert.equal(formatNumber(582100), "582,100");
});

test("formats currency from cents", () => {
  assert.equal(formatCurrencyFromCents(1299, "USD"), "$12.99");
});

test("applies basic playlist limits", () => {
  assert.equal(formatPlaylistLimit("basic"), "6");
  assert.equal(canCreatePlaylist(basicListener, 5), true);
  assert.equal(canCreatePlaylist(basicListener, 6), false);
});

test("treats gold playlist limits as unlimited", () => {
  assert.equal(formatPlaylistLimit("gold"), "Unlimited");
  assert.equal(hasUnlimitedPlaylistLimit("gold"), true);
  assert.equal(canCreatePlaylist(listener, 1000), true);
});

test("maps subscription feature permissions", () => {
  assert.equal(canEditProfileImage(basicListener), false);
  assert.equal(canUseOfflineMode(artist), true);
  assert.equal(canAccessAdvancedStats(listener), true);
});

test("keeps Glass Hearts wired to an available public mp3 file", () => {
  const track = tracks.find((item) => item.id === "track-glass-hearts");
  const audioPath = path.join(process.cwd(), "public", track.audioUrl);

  assert.equal(track.audioUrl, "/mock/audio/glass-hearts.mp3");
  assert.equal(fs.existsSync(audioPath), true);
});

test("keeps seeded playlist data aligned with app track IDs", () => {
  const userIds = new Set(users.map((user) => user.id));
  const playlistIds = new Set(playlists.map((playlist) => playlist.id));
  const trackIds = new Set(tracks.map((track) => track.id));
  const artistIds = new Set(artists.map((artist) => artist.id));
  const credentialEmails = new Set(mockCredentials.map((credential) => credential.email));

  for (const user of users) {
    assert.equal(credentialEmails.has(user.email), true, `${user.email} is missing login credentials`);
  }

  for (const track of tracks) {
    assert.equal(artistIds.has(track.artistId), true, `${track.id} has an unknown artist`);
  }

  for (const playlist of playlists) {
    assert.equal(userIds.has(playlist.ownerId), true, `${playlist.id} has an unknown owner`);

    for (const trackId of playlist.itemIds) {
      assert.equal(trackIds.has(trackId), true, `${playlist.id} includes unknown track ${trackId}`);
    }
  }

  for (const item of playlistItems) {
    assert.equal(playlistIds.has(item.playlistId), true, `${item.id} has an unknown playlist`);
    assert.equal(trackIds.has(item.trackId), true, `${item.id} has an unknown track`);
    assert.equal(userIds.has(item.addedByUserId), true, `${item.id} has an unknown adding user`);
  }
});
