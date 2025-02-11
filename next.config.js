const path = require("path");

const nextConfig = {
  reactStrictMode: true,
  env: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  },
  webpack(config) {
    config.experiments = {
      asyncWebAssembly: true,
      layers: true,
    };

    config.module.rules.push({
      test: /\.wasm$/,
      type: "javascript/auto",
      loader: "file-loader",
      options: {
        publicPath: "/_next/static/wasm/",
        outputPath: "static/wasm/",
        name: "[name].[hash].[ext]",
      },
    });

    return config;
  },
};

module.exports = nextConfig;
