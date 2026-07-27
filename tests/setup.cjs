// Node's built-in test runner cannot directly execute the app's TSX/Next aliases.
// This bootstrap installs the smallest possible transpilation and module mocks.
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const ts = require("typescript");

// Absolute repository root is used to expand the application's "@/..." alias.
const rootDir = path.resolve(__dirname, "..");
// Preserve Node's resolver so all non-overridden imports retain normal behavior.
const originalResolveFilename = Module._resolveFilename;

function resolveMock(request) {
  // Next components/hooks depend on a running App Router, so tests replace only
  // those framework boundaries with deterministic CommonJS stand-ins.
  if (request === "next/link") {
    return path.join(__dirname, "mocks", "next-link.cjs");
  }

  if (request === "next/navigation") {
    return path.join(__dirname, "mocks", "next-navigation.cjs");
  }

  return null;
}

Module._resolveFilename = function resolveFilename(request, parent, isMain, options) {
  const mockPath = resolveMock(request);

  if (mockPath) {
    return mockPath;
  }

  if (request.startsWith("@/")) {
    // Turn "@/lib/auth" into an absolute filesystem path before Node resolves it.
    return originalResolveFilename.call(this, path.join(rootDir, request.slice(2)), parent, isMain, options);
  }

  return originalResolveFilename.call(this, request, parent, isMain, options);
};

function transpile(module, filename) {
  // TypeScript's fast transpile-only API is enough because `npm run type-check`
  // separately performs full static checking.
  const source = fs.readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020
    },
    fileName: filename
  }).outputText;

  module._compile(output, filename);
}

// CSS has no meaning in static markup tests; TS/TSX use the transpiler above.
require.extensions[".css"] = function ignoreCss() {};
require.extensions[".ts"] = transpile;
require.extensions[".tsx"] = transpile;
