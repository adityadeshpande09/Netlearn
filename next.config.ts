import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Browser fixtures must never replace the build used by the local preview.
  distDir: process.env.NETLEARN_TEST_BUILD === "1" ? ".next-test" : ".next",
};

export default nextConfig;
