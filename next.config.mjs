/** @type {import('next').NextConfig} */
const nextConfig = {
  // Em `next dev`, evita reutilizar cache de webpack em disco — reduz erros
  // "Cannot find module './vendor-chunks/...'" quando `.next` fica a meio
  // (p.ex. OneDrive) ou o servidor é interrompido durante a compilação.
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
