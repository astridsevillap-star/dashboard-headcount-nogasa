import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Esta app vive en un subdirectorio junto a otra con su propio lockfile;
  // fija la raíz de rastreo a esta carpeta para evitar la ambigüedad.
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
