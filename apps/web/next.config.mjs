import path from "node:path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: true
  },
  webpack: (config, { dev }) => {
    if (dev && process.platform === "win32") {
      config.watchOptions = {
        ...config.watchOptions,
        poll: process.env.WATCHPACK_POLLING === "true" ? 1000 : undefined,
        ignored: [
          "**/node_modules/**",
          "**/.git/**",
          "**/C:/**",
          "**/pagefile.sys"
        ]
      };
    }

    return config;
  },
  outputFileTracingRoot: path.join(process.cwd(), "../..")
};

export default nextConfig;
