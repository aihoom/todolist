import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "pg",
    "@prisma/adapter-pg",
    "@aws-sdk/client-s3",
  ],
};

export default nextConfig;
