const IS_STATIC = process.env.STATIC === "1";

// For GitHub Pages the site is served from /<repo>. Override with
// NEXT_PUBLIC_BASE_PATH if the repo name differs.
const BASE_PATH = IS_STATIC
  ? process.env.NEXT_PUBLIC_BASE_PATH ?? "/Resourcemanager"
  : "";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  ...(IS_STATIC
    ? {
        output: "export",
        basePath: BASE_PATH,
        assetPrefix: BASE_PATH,
        trailingSlash: true,
        images: { unoptimized: true },
      }
    : {
        experimental: {
          // Allow Server Actions to work behind the Codespaces forwarded-port
          // domain, whose Origin differs from host.
          serverActions: {
            allowedOrigins: ["*.app.github.dev", "*.github.dev", "localhost:3000"],
          },
        },
      }),
  webpack: (config, { webpack }) => {
    if (IS_STATIC) {
      // Swap real Server Actions for client-safe no-op stubs so the static
      // export bundle contains no "use server" modules. NormalModuleReplacement
      // rewrites the request regardless of the "@/" tsconfig-paths resolution.
      const crud = new URL("./src/actions/crud.static.ts", import.meta.url).pathname;
      const demand = new URL("./src/actions/demand.static.ts", import.meta.url).pathname;
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(/^@\/actions\/crud$/, crud),
        new webpack.NormalModuleReplacementPlugin(/^@\/actions\/demand$/, demand)
      );
    }
    return config;
  },
};

export default nextConfig;
