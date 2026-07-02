const history = {
  pushed: [],
  replaced: [],
  reset() {
    this.pushed = [];
    this.replaced = [];
  }
};

function usePathname() {
  return "/";
}

function useRouter() {
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
  return new URLSearchParams();
}

module.exports = {
  __mockRouter: history,
  usePathname,
  useRouter,
  useSearchParams
};
