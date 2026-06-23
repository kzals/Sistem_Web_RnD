import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'UI Web RND',
    short_name: 'RND',
    description: 'Aplikasi Sample Tracking',
    id: '/ui-web-rnd',
    start_url: '/login',
    scope: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#1a73e8',
    icons: [
      {
        src: '/trisula-192.png',
        sizes: '192x192',
        type: 'image/png'
      },
      {
        src: '/trisula-512.png',
        sizes: '512x512',
        type: 'image/png'
      }
    ]
  }
}