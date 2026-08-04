const assert = require("node:assert/strict");
const test = require("node:test");

const { musicApi } = require("@/features/music/api");
const { operationsApi } = require("@/features/operations/api");

function installBrowserAndFetch(responseBody, status = 200) {
  const requests = [];
  global.window = {
    localStorage: {
      getItem: (key) => key === "soundwave.authToken" ? "integration-token" : null,
      setItem() {},
      removeItem() {}
    }
  };
  global.fetch = async (url, init = {}) => {
    requests.push({ url, init });
    return new Response(JSON.stringify(responseBody), {
      status,
      headers: { "Content-Type": "application/json" }
    });
  };
  return requests;
}

function cleanupBrowser() {
  delete global.window;
  delete global.fetch;
}

test("home API uses the authenticated backend contract", async (t) => {
  t.after(cleanupBrowser);
  const payload = {
    latestTracks: [],
    trendingTracks: [],
    earlyAccessTracks: [],
    recommendedTracks: [],
    recentlyPlayed: [],
    recentlyPlayedPlaylists: []
  };
  const requests = installBrowserAndFetch(payload);

  const response = await musicApi.home();

  assert.deepEqual(response, payload);
  assert.equal(requests[0].url, "http://127.0.0.1:8000/api/music/home/");
  assert.equal(new Headers(requests[0].init.headers).get("Authorization"), "Token integration-token");
});

test("accounting generation sends the exact backend payload", async (t) => {
  t.after(cleanupBrowser);
  const payload = {
    artistId: "artist-1",
    periodStart: "2026-07-01",
    periodEnd: "2026-07-31",
    currency: "USD",
    perStreamCents: 2,
    perUniqueListenerCents: 5,
    platformFeePercent: 20
  };
  const requests = installBrowserAndFetch({ id: "record-1" }, 201);

  await operationsApi.generateRevenue(payload);

  assert.equal(requests[0].url, "http://127.0.0.1:8000/api/reports/artist-revenue/generate/");
  assert.equal(requests[0].init.method, "POST");
  assert.deepEqual(JSON.parse(requests[0].init.body), payload);
});

test("stream progress is posted to the selected track endpoint", async (t) => {
  t.after(cleanupBrowser);
  const requests = installBrowserAndFetch({ counted: false }, 201);

  await musicApi.registerStream("track-7", "session-9", 10);

  assert.equal(requests[0].url, "http://127.0.0.1:8000/api/music/tracks/track-7/stream/");
  assert.deepEqual(JSON.parse(requests[0].init.body), {
    sessionId: "session-9",
    listenedSeconds: 10
  });
});
