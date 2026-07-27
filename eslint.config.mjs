// Begin with Next.js performance/correctness and TypeScript rule presets.
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextVitals,
  ...nextTypescript,
  {
    // Dependencies and generated build/type artifacts are not authored source.
    ignores: ["node_modules/**", ".next/**", "out/**", "build/**", "dist/**", "next-env.d.ts"]
  },
  {
    // Node's built-in test harness intentionally uses CommonJS fixtures.
    files: ["tests/**/*.cjs"],
    rules: {
      "@typescript-eslint/no-require-imports": "off"
    }
  },
  {
    // Local mock art uses plain img tags, and hydration effects intentionally
    // copy browser storage into React state after the first client render.
    rules: {
      "@next/next/no-img-element": "off",
      "react-hooks/set-state-in-effect": "off"
    }
  }
];

export default eslintConfig;
