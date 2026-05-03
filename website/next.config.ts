import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Add your S3 bucket hostname here to use next/image optimization
    // e.g. remotePatterns: [{ hostname: "your-cms-images.s3.us-east-1.amazonaws.com" }]
    remotePatterns: process.env.S3_HOSTNAME
      ? [{ hostname: process.env.S3_HOSTNAME }]
      : [],
    // Disable optimization if no S3 hostname is set (allows plain <img> tags)
    unoptimized: !process.env.S3_HOSTNAME,
  },
};

export default nextConfig;
