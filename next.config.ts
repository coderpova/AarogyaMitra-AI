import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "192.168.1.3",
  ],
  transpilePackages: [
    "@xenova/transformers",
  ],
  turbopack: {
    root: path.resolve(__dirname),
    resolveAlias: {
      "onnxruntime-node": "onnxruntime-web",
      "onnxruntime-node/dist/backend.js": "onnxruntime-web",
      "onnxruntime-node/dist/binding.js": "onnxruntime-web",
      "onnxruntime-node/dist/index.js": "onnxruntime-web",
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "onnxruntime-node$": "onnxruntime-web",
      "onnxruntime-node": "onnxruntime-web",
      "onnxruntime-node/dist/backend.js": "onnxruntime-web",
      "onnxruntime-node/dist/binding.js": "onnxruntime-web",
      "onnxruntime-node/dist/index.js": "onnxruntime-web",
    };
    return config;
  },
};

export default nextConfig;