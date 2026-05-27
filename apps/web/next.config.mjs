import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const repoRoot = fs.realpathSync.native(path.join(process.cwd(), "../.."));

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: true,
    outputFileTracingRoot: repoRoot,
  },
  webpack: (config, { dev }) => {
    config.resolve = config.resolve ?? {};
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      zod: require.resolve("zod"),
      "zod/v3": require.resolve("zod/v3"),
      "zod/v4": require.resolve("zod/v4"),
      "zod/v4-mini": require.resolve("zod/v4-mini"),
    };

    config.ignoreWarnings = [
      ...(config.ignoreWarnings ?? []),
      /multiple modules with names that only differ in casing/i,
    ];

    if (dev && process.platform === "win32") {
      config.watchOptions = {
        ...config.watchOptions,
        poll: process.env.WATCHPACK_POLLING === "true" ? 1000 : undefined,
        ignored: [
          "**/node_modules/**",
          "**/.git/**",
          "**/C:/**",
          "**/pagefile.sys",
        ],
      };
    }

    return config;
  },
};

export default nextConfig;
