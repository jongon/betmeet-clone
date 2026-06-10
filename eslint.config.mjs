import nextConfig from "eslint-config-next";
import nextCoreWebVitalsConfig from "eslint-config-next/core-web-vitals";
import nextTypescriptConfig from "eslint-config-next/typescript";

const config = [
  ...nextConfig,
  ...nextCoreWebVitalsConfig,
  ...nextTypescriptConfig,
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      ".content-collections/**",
      "src/generated/**",
      "next-env.d.ts",
      // Vendored tooling/skill packages — not application source.
      ".opencode/**",
      ".claude/**",
      ".aidlc/**",
    ],
  },
  {
    // Honour the `_`-prefix convention for intentionally unused params/vars.
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
];

export default config;
