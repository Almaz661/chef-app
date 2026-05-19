/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable ESLint during builds (not installed in production)
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Proxy API requests to NestJS backend during development
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
