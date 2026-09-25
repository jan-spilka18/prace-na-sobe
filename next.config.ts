import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Obrazovka, kterou klient před chvílí viděl, se při návratu ukáže hned
    // z paměti telefonu. Každá změna (odškrtnutí, uložení) volá revalidatePath,
    // což tuhle paměť smaže, takže zastaralá data nehrozí.
    staleTimes: { dynamic: 30 },
  },
};

export default nextConfig;
