/** @type {import('next').NextConfig} */
const nextConfig = {
  typedRoutes: true,
  
  webpack: (config, { dev }) => {
    // Deshabilitar cache completamente para evitar errores
    config.cache = false;
    
    // Monaco editor webpack configuration
    config.module.rules.push({
      test: /\.worker\.js$/,
      use: { loader: 'worker-loader' },
    });
    
    // Resolver fallbacks
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
    };
    
    return config;
  },
};

export default nextConfig;