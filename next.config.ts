import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  env: {
    NEXT_PUBLIC_MQTT_BROKER: process.env.NEXT_PUBLIC_MQTT_BROKER || 'wss://a2d174684b10434db4fed867424bf8e6.s1.eu.hivemq.cloud:8884/mqtt',
  },
};

export default nextConfig;
