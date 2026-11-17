import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores(["dist", "**/dist/**", "**/.next/**", "**/next-env.d.ts"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
    ],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
          message:
            "Do not use dangerouslySetInnerHTML; rely on React escaping to prevent XSS.",
        },
      ],
    },
  },
  {
    files: ["apps/**/*.{ts,tsx}", "packages/**/*.{ts,tsx}", "scripts/**/*.ts"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-floating-promises": [
        "error",
        { ignoreVoid: true, ignoreIIFE: true },
      ],
      "@typescript-eslint/no-misused-promises": [
        "error",
        { checksVoidReturn: { attributes: false, properties: false } },
      ],
    },
  },
  {
    files: [
      "apps/admin/components/**/*.{ts,tsx}",
      "apps/admin/app/**/page.tsx",
      "apps/site/components/**/*.{ts,tsx}",
      "apps/site/app/**/page.tsx",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "../lib/server",
              importNames: ["serviceDb"],
              message:
                "Do not import serviceDb in UI components or pages; keep privileged DB access inside server libraries and authorized API routes (ADR-0006).",
            },
            {
              name: "../../lib/server",
              importNames: ["serviceDb"],
              message:
                "Do not import serviceDb in UI components or pages; keep privileged DB access inside server libraries and authorized API routes (ADR-0006).",
            },
            {
              name: "../../../lib/server",
              importNames: ["serviceDb"],
              message:
                "Do not import serviceDb in UI components or pages; keep privileged DB access inside server libraries and authorized API routes (ADR-0006).",
            },
          ],
        },
      ],
    },
  },
]);
