import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import Components from 'unplugin-vue-components/vite'
import { AntDesignVueResolver } from 'unplugin-vue-components/resolvers'
import AutoImport from 'unplugin-auto-import/vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [
    vue(),
    AutoImport({
      imports: ['vue', 'vue-router', 'pinia'],
      resolvers: [AntDesignVueResolver()],
    }),
    Components({
      resolvers: [AntDesignVueResolver({ importStyle: false })],
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  build: {
    reportCompressedSize: false,
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks: {
          'ant-design-vue': ['ant-design-vue'],
          'ant-design-icons': ['@ant-design/icons-vue'],
          'vue-vendor': ['vue', 'vue-router', 'pinia'],
        }
      }
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3003',
        changeOrigin: true
      }
    }
  }
})
