import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "192.168.1.3",
  ],
  serverExternalPackages: [
    "sharp",
  ],
  turbopack: {
    root: path.resolve(__dirname),
    resolveAlias: {
      "onnxruntime-node": "onnxruntime-web",
    },
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        "onnxruntime-node$": "onnxruntime-web",
        "onnxruntime-node": "onnxruntime-web",
      };
    }
    return config;
  },
};

export default nextConfig;