// In-memory history lets tests inspect navigation without a browser.
const history = {
  pushed: [],
  replaced: [],
  reset() {
    // Reset supports future tests that need isolation between router assertions.
    this.pushed = [];
    this.replaced = [];
  }
};

function usePathname() {
  // Components under test see a stable root route by default.
  return "/";
}

function useRouter() {
  // No-op methods match the router surface; push/replace retain observable paths.
  return {
    back() {},
    forward() {},
    prefetch() {},
    push(path) {
      history.pushed.push(path);
    },
    refresh() {},
    replace(path) {
      history.replaced.push(path);
    }
  };
}

function useSearchParams() {
  // Empty params represent ordinary navigation without special query modes.
  return new URLSearchParams();
}

module.exports = {
  // Expose history specifically for assertions while preserving hook names.
  __mockRouter: history,
  usePathname,
  useRouter,
  useSearchParams
};
