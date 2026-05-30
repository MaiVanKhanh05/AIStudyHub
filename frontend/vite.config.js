<<<<<<< HEAD
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/postcss";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  css: {
    postcss: {
      plugins: [tailwindcss()],
    },
  },
});
=======
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'// hoặc @vitejs/plugin-react tùy dự án của bạn
import tailwindcss from '@tailwindcss/postcss' // Thêm dòng này

export default defineConfig({
  plugins: [
    react(),
  ],
  css: {
    postcss: {
      plugins: [
        tailwindcss(), // Sử dụng plugin mới tại đây
      ],
    },
  },
})
>>>>>>> feature-document-list
