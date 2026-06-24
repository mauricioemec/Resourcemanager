/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Allow Server Actions (CRUD / demand editor) to work behind the
    // GitHub Codespaces forwarded-port domain, whose Origin differs from host.
    serverActions: {
      allowedOrigins: ["*.app.github.dev", "*.github.dev", "localhost:3000"],
    },
  },
};

export default nextConfig;
