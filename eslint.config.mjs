import tsParser from "@typescript-eslint/parser";

export default [
  { ignores: [".next/**", "coverage/**", "node_modules/**"] },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: { parser: tsParser },
    rules: {
      "no-constant-binary-expression": "error",
      "no-duplicate-imports": "error",
      "no-unused-vars": "error",
    },
  },
];
