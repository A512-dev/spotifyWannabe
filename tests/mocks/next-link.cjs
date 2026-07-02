const React = require("react");

function Link({ children, href, ...props }) {
  const normalizedHref = typeof href === "string" ? href : href?.pathname ?? String(href);

  return React.createElement("a", { href: normalizedHref, ...props }, children);
}

module.exports = Link;
module.exports.default = Link;
