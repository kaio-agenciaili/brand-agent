/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Páginas dinâmicas (auth/cookies) nunca servidas do cache do router client-side.
    // Sem isso, navegação via <Link> pode mostrar dados da sessão anterior por até 30s.
    staleTimes: {
      dynamic: 0,
    },
  },
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
