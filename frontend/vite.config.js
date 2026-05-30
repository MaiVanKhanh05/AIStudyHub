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