const assert = require("node:assert/strict");
const test = require("node:test");

const { mockCredentials } = require("@/data/auth-credentials");
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
