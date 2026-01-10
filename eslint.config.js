import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      // Enforce status color token usage (Requirements 8.1, 8.2, 8.3)
      "no-restricted-syntax": [
        "error",
        {
          selector: "Literal[value=/bg-(green|red|orange|blue)-(50|100|200|300|400|500|600|700|800|900|950)/]",
          message: "Use status color tokens from '@/lib/status-colors' instead of hardcoded Tailwind status colors. Import getPaymentStateColors(), getOweStatusColors(), or getSemanticStatusColors().",
        },
        {
          selector: "Literal[value=/text-(green|red|orange|blue)-(50|100|200|300|400|500|600|700|800|900|950)/]",
          message: "Use status color tokens from '@/lib/status-colors' instead of hardcoded Tailwind status colors. Import getPaymentStateColors(), getOweStatusColors(), or getSemanticStatusColors().",
        },
        {
          selector: "Literal[value=/border-(green|red|orange|blue)-(50|100|200|300|400|500|600|700|800|900|950)/]",
          message: "Use status color tokens from '@/lib/status-colors' instead of hardcoded Tailwind status colors. Import getPaymentStateColors(), getOweStatusColors(), or getSemanticStatusColors().",
        },
      ],
    },
  }
);
