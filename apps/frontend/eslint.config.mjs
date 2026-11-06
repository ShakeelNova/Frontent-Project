import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

// Next.js 16 removed `next lint`; linting runs through the ESLint CLI
// (`eslint .`) with a flat config. See README "Deviations".
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTypescript,
  globalIgnores([
    ".next/**",
    "out/**",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    "next-env.d.ts",
    // Generated from the OpenAPI contract — never hand-edited or linted.
    "src/api/generated.ts",
  ]),
]);

export default eslintConfig;
