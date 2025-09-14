/** @type {import('next').NextConfig} */
const nextConfig = {
  typedRoutes: true,
  webpack: (config) => {
    // Monaco editor webpack configuration
    config.module.rules.push({
      test: /\.worker\.js$/,
      use: { loader: 'worker-loader' },
    });
    return config;
  },
};

export default nextConfig;