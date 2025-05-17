// https://nuxt.com/docs/api/configuration/nuxt-config
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineNuxtConfig({
  ssr: true,
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss'],
  css: ['~/assets/main.css'],
  vite: {
    server: {
      hmr: false // Отключить HMR в продакшене
    }
  },
  devServer: {
    https: {
    key: fs.readFileSync(path.resolve(__dirname, 'certs/key.pem'), 'utf8'),
    cert: fs.readFileSync(path.resolve(__dirname, 'certs/cert.pem'), 'utf8')
    },
    host: 'localhost'
  },
  runtimeConfig: {
    public: {
      apiBaseUrl: process.env.NUXT_PUBLIC_API_BASE_URL,
    },
  },
})