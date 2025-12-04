/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Desabilitar canvas no servidor
    config.resolve.alias.canvas = false;

    // Configurações para PDF.js funcionar no browser
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        stream: false,
      };
    }

    return config;
  },
  // Garantir que o PDF.js seja tratado como dependência externa no servidor
  experimental: {
    serverComponentsExternalPackages: ['pdfjs-dist'],
  },
}

module.exports = nextConfig
