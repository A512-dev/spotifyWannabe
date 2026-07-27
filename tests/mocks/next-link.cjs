const React = require("react");

function Link({ children, href, ...props }) {
  // Next Link accepts either a string or URL-like object; normalize both to href.
  const normalizedHref = typeof href === "string" ? href : href?.pathname ?? String(href);

  // A plain anchor is sufficient for server-rendered component assertions.
  return React.createElement("a", { href: normalizedHref, ...props }, children);
}

// Provide both CommonJS and default exports to match different transpiled imports.
module.exports = Link;
module.exports.default = Link;
