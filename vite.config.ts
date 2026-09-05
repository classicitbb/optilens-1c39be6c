import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: Number(process.env.PORT) || 8080,
  },
  preview: {
    host: "::",
    port: Number(process.env.PORT) || 4173,
  },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime"],
  },
  build: {
    rollupOptions: {
      // pdfjs-dist must be bundled. Marking it external left bare specifiers
      // ("pdfjs-dist/legacy/build/pdf.mjs") in the production chunk, which the
      // browser cannot resolve — the handbook route crashed to the error
      // boundary ("Something went wrong").
      output: {

        manualChunks(id) {
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/') || id.includes('node_modules/react/jsx-runtime')) return 'vendor-react';
          if (id.includes('node_modules/react-router')) return 'vendor-router';
          if (id.includes('node_modules/@tanstack/react-query')) return 'vendor-query';
          if (id.includes('node_modules/@supabase/supabase-js')) return 'vendor-supabase';
        },
      },
    },
  },

  test: {
    environment: "jsdom",
    setupFiles: "./src/tests/setup.ts",
    include: ["src/tests/**/*.test.ts", "src/tests/**/*.test.tsx"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: [
        "src/features/admin/security/**/*.ts",
        "src/components/admin/AdminProtectedRoute.tsx",
      ],
      thresholds: {
        lines: 95,
        functions: 95,
        branches: 90,
        statements: 95,
      },
    },
  },
}));
