import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { supabaseDevProxy } from "./scripts/vite-supabase-proxy.ts";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const localData = supabaseDevProxy(loadEnv(mode, process.cwd(), 'VITE_SUPABASE_URL').VITE_SUPABASE_URL);
  return ({
  server: {
    host: "::",
    port: Number(process.env.PORT) || 8080,
    proxy: localData.proxy,
  },
  preview: {
    host: "::",
    port: Number(process.env.PORT) || 4173,
    proxy: localData.proxy,
  },
  plugins: [react(), tailwindcss(), localData.plugin],
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
    include: ["src/tests/**/*.test.ts", "src/tests/**/*.test.tsx", "src/components/**/*.test.node.ts"],
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
});
});
