const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const ts = require("typescript");

const rootDir = path.resolve(__dirname, "..");
const originalResolveFilename = Module._resolveFilename;

function resolveMock(request) {
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
    return originalResolveFilename.call(this, path.join(rootDir, request.slice(2)), parent, isMain, options);
  }

  return originalResolveFilename.call(this, request, parent, isMain, options);
};

function transpile(module, filename) {
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

require.extensions[".css"] = function ignoreCss() {};
require.extensions[".ts"] = transpile;
require.extensions[".tsx"] = transpile;
