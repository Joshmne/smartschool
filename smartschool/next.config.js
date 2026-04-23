/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
      handler: 'CacheFirst',
      options: { cacheName: 'google-fonts', expiration: { maxEntries: 4, maxAgeSeconds: 365 * 24 * 60 * 60 } },
    },
    {
      urlPattern: /\/api\/scores|\/api\/students|\/api\/pulse/i,
      handler: 'NetworkFirst',
      options: { cacheName: 'api-cache', networkTimeoutSeconds: 5, expiration: { maxEntries: 200, maxAgeSeconds: 24 * 60 * 60 } },
    },
  ],
});

const nextConfig = {
  reactStrictMode: true,
  images: { remotePatterns: [] },
  experimental: { serverComponentsExternalPackages: ['@libsql/client'] },
};

module.exports = withPWA(nextConfig);
