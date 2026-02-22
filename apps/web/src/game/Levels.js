const TOTAL_LEVELS = 15;

export const LEVELS = Array.from({ length: TOTAL_LEVELS }, (_, idx) => {
  const t = idx / (TOTAL_LEVELS - 1);
  const terrainAmp = idx === 0 ? 0 : Number((0.18 + idx * 0.17).toFixed(2));
  const craterCount = idx === 0 ? 0 : Math.min(6 + idx * 2, 28);
  const landingPadSize = idx < 10 ? 6.0 : Number(Math.max(2.4, 6.0 - (idx - 9) * 0.65).toFixed(2));
  const roof = idx >= 5 && (idx % 2 === 1 || idx >= 10);

  return {
    gravity: Number((8.7 + t * 5.6).toFixed(2)),
    wind: Number((Math.max(0, idx - 1) * 0.14 + Math.max(0, idx - 8) * 0.08).toFixed(2)),

    // Pads / progression
    launchPadSize: 3.0,
    landingPadSize,
    roof,
    roofHeight: Number((8.2 - Math.min(2.3, Math.max(0, idx - 5) * 0.28)).toFixed(2)),
    roofScaleX: Number((1.0 + Math.min(0.7, Math.max(0, idx - 5) * 0.06)).toFixed(2)),
    roofScaleZ: Number((1.0 + Math.min(0.45, Math.max(0, idx - 7) * 0.05)).toFixed(2)),

    // Terrain profile (moon-like and progressively rougher)
    terrainAmp,
    terrainRidge: Number((terrainAmp * (idx === 0 ? 0 : 0.55)).toFixed(2)),
    terrainDetail: Number((idx === 0 ? 0 : 0.16 + t * 0.34).toFixed(2)),
    terrainFreqX: Number((0.08 + t * 0.1).toFixed(3)),
    terrainFreqZ: Number((0.07 + t * 0.09).toFixed(3)),
    terrainDiagFreq: Number((0.05 + t * 0.08).toFixed(3)),
    craterCount,
    craterDepth: Number((idx === 0 ? 0 : 0.22 + terrainAmp * 0.48).toFixed(2)),
    craterRadiusMin: Number((0.9 + (1 - t) * 0.5).toFixed(2)),
    craterRadiusMax: Number((2.1 + (1 - t) * 1.4).toFixed(2)),
    craterRim: Number((idx === 0 ? 0 : 0.08 + terrainAmp * 0.12).toFixed(2)),
    terrainSeed: idx + 1,
    corridorHalfWidth: Number(Math.max(2.2, 5.5 - idx * 0.22).toFixed(2))
  };
});
