import fs from "node:fs";
import path from "node:path";

const workspaceRoot = fs.realpathSync.native(path.join(process.cwd(), "../.."));
const sharedRoot = path.join(workspaceRoot, "packages/shared");
const nodeModulesRoot = path.join(workspaceRoot, "node_modules");

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: true,
    outputFileTracingRoot: workspaceRoot
  },
  webpack: (config, { dev }) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@internflow/shared": sharedRoot,
      "@internflow/shared/src": path.join(sharedRoot, "src"),
      zod: path.join(nodeModulesRoot, "zod")
    };

    if (dev && process.platform === "win32") {
      config.watchOptions = {
        ...config.watchOptions,
        poll: process.env.WATCHPACK_POLLING === "true" ? 1000 : undefined,
        ignored: [
          "**/node_modules/**",
          "**/.git/**",
          "**/C:/**",
          "**/pagefile.sys",
          "**/System Volume Information/**"
        ]
      };

      config.snapshot = {
        ...config.snapshot,
        managedPaths: [nodeModulesRoot],
        immutablePaths: [nodeModulesRoot],
        resolveBuildDependencies: {
          ...(config.snapshot?.resolveBuildDependencies || {}),
          hash: true
        }
      };
    }

    return config;
  },
};

export default nextConfig;
