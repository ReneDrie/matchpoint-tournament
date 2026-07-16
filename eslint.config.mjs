import { defineConfig, globalIgnores } from "eslint/config";
import prettierConfig from "eslint-config-prettier";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      eqeqeq: ["error", "smart"],
      "no-else-return": "error",
      "no-lonely-if": "error",
      "no-var": "error",
      "object-shorthand": "error",
      "prefer-const": "error",
      "prefer-template": "error",
    },
  },
  prettierConfig,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "backend/public/uploads/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
