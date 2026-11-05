import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Pin the root so standalone output isn't nested by lockfiles in parent directories.
  outputFileTracingRoot: process.cwd(),
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    root: process.cwd(),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
