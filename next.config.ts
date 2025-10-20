import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    'local-origin.dev',
    '*.local-origin.dev',
    '192.168.100.38',
    'localhost',
    '*.loca.lt',
    '*.ngrok.io',
    '*.ngrok-free.app'
  ],
};

export default nextConfig;
