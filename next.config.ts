import type { NextConfig } from 'next';

const nextConfig: NextConfig = process.env.RAILWAY_BUILD ? {output:'standalone'} : {};

export default nextConfig;
