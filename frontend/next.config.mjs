/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_MAPBOX_TOKEN: process.env.NEXT_PUBLIC_MAPBOX_TOKEN,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? '',
  },
  turbopack: {},
  serverExternalPackages: ['@aws-sdk/client-bedrock-runtime', 'geotiff', 'proj4'],
};

export default nextConfig;
