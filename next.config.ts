import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "192.168.1.3",
  ],
  turbopack: {
    root: path.resolve(__dirname),
    resolveAlias: {
      "onnxruntime-node": "onnxruntime-web",
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "onnxruntime-node$": "onnxruntime-web",
    };
    return config;
  },
};

export default nextConfig;