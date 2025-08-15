/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons']
  },
  images: {
    domains: ['img.youtube.com', 'i.ytimg.com'],
    formats: ['image/webp', 'image/avif'],
    unoptimized: true, // Added unoptimized option
  },
  eslint: {
    ignoreDuringBuilds: true, // Added eslint ignoreDuringBuilds option
  },
  typescript: {
    ignoreBuildErrors: true, // Added typescript ignoreBuildErrors option
  },
  // Enable compression
  compress: true,
  // Optimize for production
  swcMinify: true,
  // Add security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          }
        ]
      }
    ]
  }
}

export default nextConfig
