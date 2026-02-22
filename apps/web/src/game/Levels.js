const TOTAL_LEVELS = 15;

export const LEVELS = Array.from({ length: TOTAL_LEVELS }, (_, idx) => {
  const t = idx / (TOTAL_LEVELS - 1);
  const terrainAmp = idx === 0 ? 0 : Number((0.18 + idx * 0.17).toFixed(2));
  const craterCount = idx === 0 ? 0 : Math.min(6 + idx * 2, 28);
  const landingPadSize = idx < 10 ? 6.0 : Number(Math.max(2.4, 6.0 - (idx - 9) * 0.65).toFixed(2));
  const mountainCount = idx < 2 ? 0 : Math.min(2 + idx, 10);
  const chasmCount = idx < 4 ? 0 : Math.min(1 + Math.floor((idx - 3) * 0.9), 5);
  const corridorHalfWidth = idx === 0
    ? 6.2
    : Number(Math.max(1.8, 5.4 - idx * 0.28 - Math.max(0, idx - 5) * 0.18).toFixed(2));
  const corridorFlattenStrength = idx === 0
    ? 1.0
    : Number(Math.max(0.08, 0.9 - idx * 0.1 - Math.max(0, idx - 5) * 0.07).toFixed(2));
  const mountainHeight = idx < 2 ? 0 : Number((1.3 + idx * 0.48 + Math.max(0, idx - 5) * 0.32).toFixed(2));
  const mountainIntrusion = idx < 2 ? 0 : Number(Math.min(1.0, 0.22 + idx * 0.085).toFixed(2));
  const chasmDepth = idx < 4 ? 0 : Number((1.4 + idx * 0.52 + Math.max(0, idx - 6) * 0.45).toFixed(2));
  const ceilingMargin = idx === 0
    ? 6.5
    : Number(Math.max(1.15, 4.4 - idx * 0.34 - Math.max(0, idx - 5) * 0.22).toFixed(2));

  return {
    gravity: Number((8.7 + t * 5.6).toFixed(2)),
    wind: Number((Math.max(0, idx - 1) * 0.14 + Math.max(0, idx - 8) * 0.08).toFixed(2)),

    // Pads / progression
    launchPadSize: 3.0,
    landingPadSize,

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
    corridorHalfWidth,
    corridorFlattenStrength,
    mountainCount,
    mountainHeight,
    mountainIntrusion,
    mountainRadiusMin: Number((1.4 + (1 - t) * 0.7).toFixed(2)),
    mountainRadiusMax: Number((2.6 + (1 - t) * 1.2).toFixed(2)),
    chasmCount,
    chasmDepth,
    chasmWidthX: Number((0.9 + t * 0.7).toFixed(2)),
    chasmWidthZ: Number((3.4 + t * 2.6).toFixed(2)),
    terrainMinClamp: Number((-2.8 - Math.max(0, idx - 3) * 0.55 - Math.max(0, idx - 8) * 0.35).toFixed(2)),
    terrainMaxClamp: Number((4.8 + Math.max(0, idx - 1) * 0.42 + Math.max(0, idx - 6) * 0.28).toFixed(2)),
    ceilingMargin
  };
});
