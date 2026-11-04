import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tableau de bord entièrement dynamique (session, base de données) :
  // on garde le rendu dynamique classique plutôt que Cache Components.
  serverExternalPackages: ["twilio"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
